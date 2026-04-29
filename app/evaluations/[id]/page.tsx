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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isForeigner, setIsForeigner] = useState(false);
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
        historico.slice(0, 3),
        recordingDuration,
        isForeigner
      );

      // Salva dados temporários para a página de revisão
      sessionStorage.setItem('temp_evaluation_result', JSON.stringify({
        ...result,
        audioUrl,
        textoId: texto.id,
        textoTitulo: texto.titulo,
        textoConteudo: texto.conteudo
      }));

      router.push(`/evaluations/${alunoId}/review`);
    } catch (err: unknown) {
      console.error('Erro ao processar leitura:', err);
      alert('Erro ao processar leitura. Tente novamente.');
    } finally {
      setProcessing(false);
    }
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
            <div className="evaluation-timer" style={{ color: timeLeft <= 10 ? 'var(--error)' : 'var(--text-primary)' }}>
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

            <h4 style={{ marginBottom: "0.5rem", fontWeight: 800 }}>Dica Pedagógica</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1rem" }}>
              Garanta que o aluno esteja em postura confortável e o microfone posicionado corretamente.
            </p>
            <div className="glass-panel" style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.05)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input
                type="checkbox"
                id="is-foreigner"
                checked={isForeigner}
                onChange={(e) => setIsForeigner(e.target.checked)}
                style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer" }}
              />
              <label htmlFor="is-foreigner" style={{ fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", color: "var(--primary)" }}>
                🌎 Aluno Estrangeiro?
              </label>
            </div>
      </div>
    </div>
    </div>

  );
}
