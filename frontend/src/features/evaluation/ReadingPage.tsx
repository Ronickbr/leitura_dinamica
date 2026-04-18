import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAlunoById, type Aluno } from '../../services/studentsService';
import { getTextos, type Texto } from '../../services/textsService';
import { saveAvaliacao } from '../../services/evaluationsService';
import { processAudio } from '../../api/apiService';

// Ícones simplificados
const MicIcon = () => <span>🎤</span>;
const SquareIcon = () => <span>⏹️</span>;
const RotateCcwIcon = () => <span>🔄</span>;
const CheckCircleIcon = () => <span>✅</span>;
const ChevronLeftIcon = () => <span>⬅️</span>;

const ReadingPage = () => {
    const { alunoId } = useParams();
    const navigate = useNavigate();
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
        const fetchData = async () => {
            if (!alunoId) return;
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
        };
        fetchData();
    }, [alunoId]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    useEffect(() => {
        if (isRecording && timeLeft > 0) {
            timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && isRecording) {
            stopRecording();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording, stopRecording, timeLeft]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioUrl(URL.createObjectURL(audioBlob));
                setIsFinished(true);
            };
            mediaRecorder.start();
            setIsRecording(true);
            setTimeLeft(60);
        } catch {
            alert('Erro ao acessar o microfone.');
        }
    };

    const handleFinish = async () => {
        if (!audioUrl || !texto) return;
        setProcessing(true);
        try {
            const audioBlob = await fetch(audioUrl).then(r => r.blob());
            const result = await processAudio(audioBlob, texto.conteudo);

            await saveAvaliacao({
                alunoId: alunoId || '',
                textoId: texto.id,
                pcm: result.pcm,
                precisao: result.metrics.precisao,
                transcricao: result.transcription,
                diagnosticoIA: result.analysis.diagnostico,
                intervencaoIA: result.analysis.intervencao,
                metricasQualitativas: result.analysis.metricas_qualitativas
            });

            navigate('/resultados', { state: { result } });
        } catch {
            alert('Erro ao processar leitura.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="animate-in" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Preparando...</div>;

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => navigate('/selecao')} className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}><ChevronLeftIcon /></button>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Avaliação de <span style={{ color: 'var(--primary)' }}>Fluência</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aluno: <strong>{aluno?.nome}</strong> ({aluno?.turma})</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
                <div className="glass-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem' }}>{texto?.titulo}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{texto?.serie}</span>
                        </div>
                        {textosDisponiveis.length > 1 && !isRecording && !isFinished && (
                            <select value={texto?.id} onChange={e => setTexto(textosDisponiveis.find(t => t.id === e.target.value) || null)} className="glass-panel" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'white' }}>
                                {textosDisponiveis.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                            </select>
                        )}
                    </div>
                    <p style={{ fontSize: '1.4rem', lineHeight: '1.7', color: 'var(--text-main)', fontStyle: isRecording ? 'italic' : 'normal' }}>{texto?.conteudo}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: timeLeft <= 10 ? 'var(--accent)' : 'var(--text-main)', marginBottom: '0.5rem' }}>
                            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>SEGUNDOS RESTANTES</p>

                        {!isRecording && !isFinished && (
                            <button onClick={startRecording} className="btn-primary" style={{ width: '100%', padding: '1.2rem', borderRadius: '16px' }}><MicIcon /> Iniciar</button>
                        )}
                        {isRecording && (
                            <button onClick={stopRecording} className="btn-primary" style={{ width: '100%', background: 'var(--accent)', padding: '1.2rem', borderRadius: '16px' }}><SquareIcon /> Parar</button>
                        )}
                        {isFinished && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <audio src={audioUrl || ''} controls style={{ width: '100%', height: '32px' }} />
                                <button onClick={handleFinish} className="btn-primary" disabled={processing} style={{ width: '100%', background: 'var(--success)' }}>
                                    {processing ? 'Analisando...' : <><CheckCircleIcon /> Confirmar</>}
                                </button>
                                <button onClick={() => { setAudioUrl(null); setIsFinished(false); }} className="btn-outline" style={{ width: '100%' }}><RotateCcwIcon /> Refazer</button>
                            </div>
                        )}
                    </div>
                    <div className="glass-card" style={{ padding: '1.5rem', fontSize: '0.85rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Dica Pedagógica:</h4>
                        <p style={{ color: 'var(--text-muted)' }}>Garanta que o aluno esteja em postura confortável e o microfone posicionado corretamente.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadingPage;
