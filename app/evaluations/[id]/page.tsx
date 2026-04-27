"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMobileExperience } from "@/app/components/MobileExperienceProvider";
import { useFirebase } from "@/app/components/FirebaseProvider";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getTextos, type Texto } from "@/lib/textsService";
import { processAudio, saveAvaliacao, getAvaliacoesPorAluno, type Avaliacao } from "@/lib/evaluationsService";
import { getNormaNacional, getPerformanceLevel } from "@/lib/pcmUtils";

const MicIcon = () => <span>🎤</span>;
const SquareIcon = () => <span>⏹️</span>;
const CheckCircleIcon = () => <span>✅</span>;

export default function ReadingPage() {
  const params = useParams();
  const router = useRouter();
  const { isMobile } = useMobileExperience();
  const { initialized: firebaseInitialized } = useFirebase();
  const alunoId = params.id as string;

  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [textosDisponiveis, setTextosDisponiveis] = useState<Texto[]>([]);
  const [texto, setTexto] = useState<Texto | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [historico, setHistorico] = useState<Avaliacao[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedEvaluationId, setSavedEvaluationId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!alunoId || !firebaseInitialized) return;
      setLoading(true);
      try {
        const [studentData, allTexts, studentHistory] = await Promise.all([
          getAlunoById(alunoId),
          getTextos(),
          getAvaliacoesPorAluno(alunoId)
        ]);

        if (studentData) {
          setAluno(studentData);

          const studentSerieNorm = studentData.serie.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

          const filtered = allTexts.filter(t => {
            const textSerieNorm = t.serie.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            // Tenta match exato ou match parcial se houver números iguais (resiliência)
            if (studentSerieNorm === textSerieNorm) return true;

            const sNum = studentData.serie.match(/(\d+)/)?.[1];
            const tNum = t.serie.match(/(\d+)/)?.[1];
            return sNum && tNum && sNum === tNum;
          });

          setTextosDisponiveis(filtered);
          if (filtered.length > 0) {
            setTexto(filtered[0]);
          }
          setHistorico(studentHistory);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [alunoId, firebaseInitialized]);

  const [tempResult, setTempResult] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const qualitativeMetrics = [
    { key: 'leitura_precisa', label: 'Leitura Precisa', icon: '🎯' },
    { key: 'leitura_silabada', label: 'Leitura Silabada', icon: '🐢' },
    { key: 'boa_entonacao', label: 'Boa Entonação', icon: '🎭' },
    { key: 'interpretacao', label: 'Interpretação', icon: '🧠' },
    { key: 'pontuacao', label: 'Pontuação', icon: '📍' }
  ] as const;

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, timeLeft]);

  const startRecording = async () => {
    console.log("Iniciando gravação...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        setAudioUrl(URL.createObjectURL(audioBlob));

        // Calcula a duração real em segundos
        if (recordingStartTimeRef.current) {
          const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
          setRecordingDuration(Math.min(duration, 60)); // Máximo de 60s
        }

        setIsFinished(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(60);
      recordingStartTimeRef.current = Date.now();
    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const handleFinish = async () => {
    if (!audioUrl || !texto) return;
    setProcessing(true);
    try {
      if (!texto?.conteudo) {
        alert('Texto sem conteúdo para avaliação.');
        return;
      }
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const result = await processAudio(
        audioBlob,
        texto.conteudo,
        aluno?.serie,
        aluno?.metaPCM,
        historico.slice(0, 3), // Enviamos as últimas 3 avaliações para contexto
        recordingDuration
      );
      setTempResult(result);
      setIsReviewing(true);
    } catch (err: unknown) {
      console.error('Erro ao processar leitura:', err);
      alert('Erro ao processar leitura. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const confirmAndSave = async () => {
    if (!tempResult || !texto) return;
    setProcessing(true);
    try {
      const evaluationId = await saveAvaliacao({
        alunoId: alunoId,
        textoId: texto.id,
        pcm: tempResult.pcm,
        precisao: tempResult.metrics.precisao,
        transcricao: tempResult.transcription,
        transcricaoMarcada: tempResult.analysis.transcricao_marcada,
        diagnosticoIA: tempResult.analysis.diagnostico,
        intervencaoIA: tempResult.analysis.intervencao,
        metricasQualitativas: tempResult.analysis.metricas_qualitativas
      });
      setSavedEvaluationId(evaluationId);
      setShowSuccessModal(true);
      setIsReviewing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar avaliação.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleMetric = (key: string) => {
    setTempResult((prev: any) => ({
      ...prev,
      analysis: {
        ...prev.analysis,
        metricas_qualitativas: {
          ...prev.analysis.metricas_qualitativas,
          [key]: !prev.analysis.metricas_qualitativas[key]
        }
      }
    }));
  };


  if (loading) return <div className="animate-in" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Preparando...</div>;

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-content">
          <button
            onClick={() => router.push('/evaluations/new')}
            className="btn-outline-round"
            aria-label="Voltar para seleção"
          >
            ⬅️
          </button>
          <div className="page-header-info">
            <h2 className="page-title">
              Avaliação de <span style={{ color: 'var(--primary)' }}>Fluência</span>
            </h2>
            <p className="page-subtitle">
              Aluno: <strong>{aluno?.nome}</strong> ({aluno?.turma})
            </p>
            <div className="evaluation-meta-chips">
              {aluno?.serie ? <span className="perf-chip">{aluno.serie}</span> : null}
              {aluno?.turma ? <span className="perf-chip">Turma {aluno.turma}</span> : null}
              <span className="perf-chip">Leitura guiada</span>
            </div>
          </div>
        </div>
      </header>

      <div className="evaluation-layout">
        <div className="glass-card evaluation-text-card">
          <div className="evaluation-text-header">
            <div>
              <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>{texto?.titulo}</h3>
              <span className="library-badge library-badge-primary">
                {texto?.serie}
              </span>
            </div>
            {textosDisponiveis.length > 1 && !isRecording && !isFinished && (
              <select
                value={texto?.id}
                onChange={e => setTexto(textosDisponiveis.find(t => t.id === e.target.value) || null)}
                className="filter-select"
                aria-label="Selecionar texto"
              >
                {textosDisponiveis.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            )}
          </div>
          {texto ? (
            <p className="evaluation-reading-text" style={{ fontStyle: isRecording ? 'italic' : 'normal' }}>
              {texto.conteudo}
            </p>
          ) : (
            <div className="empty-state-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <h3 className="section-title" style={{ color: 'var(--error)' }}>Nenhum texto encontrado</h3>
              <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>Não existem textos cadastrados para a série <strong>{aluno?.serie}</strong>.</p>
              <button onClick={() => router.push('/texts')} className="btn-outline" style={{ marginTop: '1.5rem' }}>Ir para Biblioteca</button>
            </div>
          )}
        </div>

        <div className="evaluation-sidebar">
          <div className="glass-card evaluation-recorder-card">
            <div className="evaluation-status-row">
              <span className="perf-chip">{isRecording ? 'Gravando' : isFinished ? 'Pronto para revisar' : 'Aguardando'}</span>
              <span className="perf-chip">{isMobile ? 'Modo mobile' : 'Modo desktop'}</span>
            </div>
            <div className="evaluation-timer" style={{ color: timeLeft <= 10 ? 'var(--error)' : 'var(--text-main)' }}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
            <p className="mobile-data-label" style={{ marginBottom: '1.5rem' }}>
              Segundos restantes
            </p>

            {!isRecording && !isFinished && (
              <button onClick={startRecording} className="btn-primary evaluation-primary-action" style={{ width: '100%' }}>
                <MicIcon /> Iniciar gravação
              </button>
            )}
            {isRecording && (
              <button onClick={stopRecording} className="btn-primary evaluation-primary-action" style={{ width: '100%', background: 'var(--error)' }}>
                <SquareIcon /> Parar gravação
              </button>
            )}
            {isFinished && (
              <div className="evaluation-finished-actions">
                <audio src={audioUrl || ''} controls className="evaluation-audio-player" />
                <button onClick={handleFinish} className="btn-primary" disabled={processing} style={{ width: '100%' }}>
                  {processing ? 'Analisando...' : <><CheckCircleIcon /> Revisar resultado</>}
                </button>
                <button onClick={() => { setAudioUrl(null); setIsFinished(false); }} className="btn-outline" style={{ width: '100%' }}>
                  🔄 Gravar novamente
                </button>
              </div>
            )}
            {!isFinished && (
              <div className="evaluation-helper-copy">
                Leia o texto com calma. Quando terminar, revise o áudio antes de salvar a avaliação.
              </div>
            )}
          </div>

          <div className="glass-card evaluation-tip-card">
            <h4 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Dica Pedagógica</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Garanta que o aluno esteja em postura confortável e o microfone posicionado corretamente.
            </p>
          </div>
        </div>
      </div>

      {isReviewing && (
        <div className="glass-modal">
          <div className="glass-card animate-in evaluation-review-sheet" style={{ maxWidth: "600px", width: "100%", boxShadow: "var(--glass-shadow)" }}>
            <h2 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>📝</span> Revisar Avaliação
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <p className="mobile-data-label" style={{ marginBottom: "0.5rem" }}>RESULTADO QUANTITATIVO</p>
                <div className="evaluation-results-grid glass-panel">
                  <div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--primary)" }}>{tempResult.pcm}</div>
                    <div className="mobile-data-label">PCM</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--success)" }}>{tempResult.metrics.precisao}%</div>
                    <div className="mobile-data-label">PRECISÃO</div>
                  </div>
                </div>
              </div>

              {tempResult.analysis.analise_evolucao && (
                <div className="glass-panel" style={{ background: "rgba(99, 102, 241, 0.1)", padding: "1.25rem", borderColor: "var(--primary)" }}>
                  <p className="mobile-data-label" style={{ color: "var(--primary)", marginBottom: "0.5rem" }}>📈 ANÁLISE DE EVOLUÇÃO</p>
                  <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>{tempResult.analysis.analise_evolucao}</p>
                </div>
              )}

              {tempResult.analysis.transcricao_marcada && (
                <div>
                  <p className="mobile-data-label" style={{ marginBottom: "0.5rem" }}>TEXTO MARCADO (PREVISÃO)</p>
                  <div className="evaluation-transcription-box" style={{ background: "rgba(0,0,0,0.02)" }}>
                    <p
                      style={{ fontSize: "0.95rem", lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{
                        __html: tempResult.analysis.transcricao_marcada
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\[(.*?)\]/g, '<span class="marking-omission">[$1]</span>')
                          .replace(/\((.*?)\)/g, '<span class="marking-addition">($1)</span>')
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="mobile-data-label" style={{ marginBottom: "1rem" }}>MÉTRICAS QUALITATIVAS (TOQUE PARA ALTERAR)</p>
                <div className="evaluation-metrics-list">
                  {qualitativeMetrics.map((m) => (
                    <div
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      className={`evaluation-metric-card ${tempResult.analysis.metricas_qualitativas[m.key] ? 'selected' : ''}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "1rem" }}>{m.icon} {m.label}</span>
                        <span className="mobile-data-label" style={{ color: tempResult.analysis.metricas_qualitativas[m.key] ? "var(--success)" : undefined }}>
                          {tempResult.analysis.metricas_qualitativas[m.key] ? "SIM" : "NÃO"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                        {tempResult.analysis.metricas_qualitativas[`${m.key}_justificativa`]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="evaluation-review-actions">
              <button onClick={() => setIsReviewing(false)} className="btn-outline" style={{ flex: 1 }}>Voltar</button>
              <button onClick={confirmAndSave} disabled={processing} className="btn-primary" style={{ flex: 2, background: "var(--success)" }}>
                {processing ? "Salvando..." : "Salvar Avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="glass-modal animate-in" style={{ zIndex: 3000 }}>
          <div className="glass-card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🎉</div>
            <h2 className="page-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Avaliação Concluída!</h2>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>
              Os dados de <strong>{aluno?.nome}</strong> foram processados e salvos com sucesso.
            </p>

            <div className="glass-panel" style={{ marginBottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <div className="mobile-data-label">PCM</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary)" }}>{tempResult?.pcm}</div>
              </div>
              <div>
                <div className="mobile-data-label">Precisão</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--success)" }}>{tempResult?.metrics.precisao}%</div>
              </div>
              <div style={{ gridColumn: "span 2", paddingTop: "0.5rem", borderTop: "1px solid var(--glass-border-light)" }}>
                <div className="mobile-data-label">Nível de Desempenho</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{getPerformanceLevel(tempResult?.pcm || 0)}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={() => router.push(`/history/${savedEvaluationId}`)}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                📊 Ver Relatório Completo
              </button>
              <button
                onClick={() => router.push('/evaluations/new')}
                className="btn-outline"
                style={{ width: "100%" }}
              >
                🔄 Nova Avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
