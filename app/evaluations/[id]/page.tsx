"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMobileExperience } from "@/app/components/MobileExperienceProvider";
import { useFirebase } from "@/app/components/FirebaseProvider";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getTextos, type Texto } from "@/lib/textsService";
import { processAudio, saveAvaliacao } from "@/lib/evaluationsService";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!alunoId || !firebaseInitialized) return;
      setLoading(true);
      try {
        const [studentData, allTexts] = await Promise.all([
          getAlunoById(alunoId),
          getTextos()
        ]);

        if (studentData) {
          setAluno(studentData);
          const filtered = allTexts.filter(t =>
            t.serie.toLowerCase().trim() === studentData.serie.toLowerCase().trim()
          );
          setTextosDisponiveis(filtered);
          if (filtered.length > 0) setTexto(filtered[0]);
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
        setIsFinished(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(60);
    } catch (err) {
      console.error('Erro ao acessar o microfone:', err);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const handleFinish = async () => {
    if (!audioUrl || !texto) return;
    setProcessing(true);
    try {
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const result = await processAudio(audioBlob, texto.conteudo);
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
        diagnosticoIA: tempResult.analysis.diagnostico,
        intervencaoIA: tempResult.analysis.intervencao,
        metricasQualitativas: tempResult.analysis.metricas_qualitativas
      });
      router.push(`/history/${evaluationId}`);
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
      <header className="page-header evaluation-header" style={{ marginBottom: '2rem' }}>
        <div className="page-header-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <button
            onClick={() => router.push('/evaluations/new')}
            className="btn-outline-round"
            aria-label="Voltar para seleção"
          >
            ⬅️
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 className="page-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', marginBottom: '0.3rem' }}>
              Avaliação de <span style={{ color: 'var(--primary)' }}>Fluência</span>
            </h2>
            <p className="page-subtitle" style={{ marginBottom: '0.9rem' }}>
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
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{texto?.titulo}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.65rem', borderRadius: '999px', display: 'inline-flex' }}>
                {texto?.serie}
              </span>
            </div>
            {textosDisponiveis.length > 1 && !isRecording && !isFinished && (
              <select
                value={texto?.id}
                onChange={e => setTexto(textosDisponiveis.find(t => t.id === e.target.value) || null)}
                className="glass-panel evaluation-text-select"
                aria-label="Selecionar texto"
                style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem', color: 'var(--text-main)' }}
              >
                {textosDisponiveis.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
            )}
          </div>
          <p className="evaluation-reading-text" style={{ fontStyle: isRecording ? 'italic' : 'normal' }}>
            {texto?.conteudo}
          </p>
        </div>

        <div className="evaluation-sidebar">
          <div className="glass-card evaluation-recorder-card">
            <div className="evaluation-status-row">
              <span className="perf-chip">{isRecording ? 'Gravando' : isFinished ? 'Pronto para revisar' : 'Aguardando'}</span>
              <span className="perf-chip">{isMobile ? 'Modo mobile' : 'Modo desktop'}</span>
            </div>
            <div className="evaluation-timer" style={{ color: timeLeft <= 10 ? 'var(--accent)' : 'var(--text-main)' }}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Segundos restantes
            </p>

            {!isRecording && !isFinished && (
              <button onClick={startRecording} className="btn-primary evaluation-primary-action" style={{ width: '100%', padding: '1.1rem 1.25rem', borderRadius: '18px' }}>
                <MicIcon /> Iniciar gravação
              </button>
            )}
            {isRecording && (
              <button onClick={stopRecording} className="btn-primary evaluation-primary-action" style={{ width: '100%', background: 'var(--accent)', padding: '1.1rem 1.25rem', borderRadius: '18px' }}>
                <SquareIcon /> Parar gravação
              </button>
            )}
            {isFinished && (
              <div className="evaluation-finished-actions">
                <audio src={audioUrl || ''} controls className="evaluation-audio-player" style={{ width: '100%' }} />
                <button onClick={handleFinish} className="btn-primary" disabled={processing} style={{ width: '100%', background: 'var(--success)' }}>
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

          <div className="glass-card evaluation-tip-card" style={{ padding: '1.5rem', fontSize: '0.85rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Dica Pedagógica</h4>
            <p style={{ color: 'var(--text-muted)' }}>Garanta que o aluno esteja em postura confortável e o microfone posicionado corretamente.</p>
          </div>
        </div>
      </div>

      {isReviewing && (
        <div className="evaluation-review-overlay">
          <div className="glass-card animate-in evaluation-review-sheet" style={{ maxWidth: "600px", width: "100%", boxShadow: "var(--glass-shadow)" }}>
            <h2 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>📝</span> Revisar Avaliação
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>RESULTADO QUANTITATIVO</p>
                <div className="evaluation-results-grid" style={{ background: "var(--glass-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--primary)" }}>{tempResult.pcm}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PCM</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--success)" }}>{tempResult.metrics.precisao}%</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PRECISÃO</div>
                  </div>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>MÉTRICAS QUALITATIVAS (TOQUE PARA ALTERAR)</p>
                <div className="evaluation-metrics-list">
                  {qualitativeMetrics.map((m) => (
                    <div
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      className="evaluation-metric-card"
                      style={{
                        background: tempResult.analysis.metricas_qualitativas[m.key] ? "rgba(16, 185, 129, 0.1)" : "var(--glass-bg)",
                        border: `1px solid ${tempResult.analysis.metricas_qualitativas[m.key] ? "var(--success)" : "var(--glass-border)"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{m.icon} {m.label}</span>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 900,
                          color: tempResult.analysis.metricas_qualitativas[m.key] ? "var(--success)" : "var(--text-muted)"
                        }}>
                          {tempResult.analysis.metricas_qualitativas[m.key] ? "SIM" : "NÃO"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
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
    </div>

  );
}
