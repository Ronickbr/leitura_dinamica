"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "../components/SettingsProvider";
import { useFirebase } from "../components/FirebaseProvider";
import * as XLSX from "xlsx";
import { addAluno, getAlunos, Aluno, addImportRecord, getImportHistory, ImportRecord } from "@/lib/services";

export default function SettingsPage() {
    const router = useRouter();
    const { isAnonymized, setAnonymized } = useSettings();
    const { initialized: firebaseInitialized } = useFirebase();
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [history, setHistory] = useState<ImportRecord[]>([]);

    useEffect(() => {
        if (firebaseInitialized) {
            loadHistory();
        }
    }, [firebaseInitialized]);

    async function loadHistory() {
        const data = await getImportHistory();
        setHistory(data);
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setUploadStatus({ message: 'Lendo arquivo...', type: '' });

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (jsonData.length < 1) {
                setUploadStatus({ message: 'O arquivo parece estar vazio ou sem dados.', type: 'error' });
                return;
            }

            const normalize = (s: any) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

            // Busca a linha de cabeçalho (a primeira que contenha algo parecido com "Nome")
            let headerRowIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
                if (jsonData[i].some(cell => {
                    const n = normalize(cell);
                    return n === "nome" || n === "name" || n === "aluno" || n === "estudante" || n === "discente" || n.includes("nome");
                })) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                setUploadStatus({ message: 'Não foi possível encontrar a coluna "Nome" na planilha.', type: 'error' });
                return;
            }

            const headers = jsonData[headerRowIndex];
            const getIndex = (targets: string[]) => {
                const normalizedTargets = targets.map(t => normalize(t));
                // Tenta correspondência exata primeiro
                let foundIndex = headers.findIndex(h => normalizedTargets.includes(normalize(h)));

                // Se não encontrar, tenta correspondência parcial (ex: "Nome do Aluno" contém "nome")
                if (foundIndex === -1) {
                    foundIndex = headers.findIndex(h => {
                        const nh = normalize(h);
                        return nh !== "" && normalizedTargets.some(t => nh.includes(t) || t.includes(nh));
                    });
                }
                return foundIndex;
            };

            const idxNome = getIndex(["nome", "name", "aluno", "estudante", "discente"]);
            const idxTurma = getIndex(["turma", "class", "grupo", "equipe", "sala"]);
            const idxSerie = getIndex(["serie", "grade", "ano", "ensino", "escolaridade", "escolar"]);
            const idxTurno = getIndex(["turno", "shift", "periodo", "horario"]);
            const idxDiag = getIndex(["diagnostico", "diagnostic", "laudo", "diagnóstico", "diagnostico", "observacao", "necessidade"]);

            console.log("Header encontrado na linha:", headerRowIndex);
            console.log("Indices mapeados:", { idxNome, idxTurma, idxSerie, idxTurno, idxDiag });

            let successCount = 0;
            let errorCount = 0;
            let duplicateCount = 0;

            // Busca alunos existentes para evitar duplicatas de forma eficiente no loop
            const existingAlunos = await getAlunos();
            const existingKeys = new Set(existingAlunos.map((a: Aluno) =>
                `${normalize(a.nome)}|${normalize(a.turma)}|${normalize(a.serie)}`
            ));

            // Processa a partir da linha seguinte ao cabeçalho
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const nome = row[idxNome];
                if (!nome) continue; // Pula linhas sem nome

                const turma = idxTurma !== -1 && row[idxTurma] ? String(row[idxTurma]).trim() : "Geral";
                const serieRaw = idxSerie !== -1 && row[idxSerie] ? row[idxSerie] : "1º Ano";
                const turno = idxTurno !== -1 && row[idxTurno] ? row[idxTurno] : "Manhã";
                const diagnostico = idxDiag !== -1 && row[idxDiag] ? row[idxDiag] : "Nenhum";

                // Normalização de série (ex: "3" ou "3º" -> "3º Ano")
                let serie = String(serieRaw).trim();
                if (/^\d+º?$/.test(serie)) {
                    serie = serie.endsWith("º") ? `${serie} Ano` : `${serie}º Ano`;
                }

                // Verifica duplicata localmente antes de tentar salvar
                const key = `${normalize(nome)}|${normalize(turma)}|${normalize(serie)}`;
                if (existingKeys.has(key)) {
                    console.log(`Pulando duplicado: ${nome}`);
                    duplicateCount++;
                    continue;
                }

                try {
                    const resultId = await addAluno({
                        nome: String(nome).trim(),
                        turma: turma,
                        serie: serie,
                        turno: String(turno),
                        diagnostico: String(diagnostico)
                    } as Omit<Aluno, 'id'>);

                    if (resultId) {
                        successCount++;
                        existingKeys.add(key); // Adiciona ao set para evitar duplicatas no mesmo arquivo
                    } else {
                        errorCount++;
                    }
                } catch (e) {
                    console.error(`Erro ao importar aluno "${nome}":`, e);
                    errorCount++;
                }
            }

            // Salva no histórico
            await addImportRecord({
                fileName: file.name,
                successCount,
                errorCount
            });
            loadHistory();

            setUploadStatus({
                message: `Importação concluída! ${successCount} novos alunos adicionados${duplicateCount > 0 ? `, ${duplicateCount} duplicados ignorados` : ''}${errorCount > 0 ? ` (${errorCount} erros)` : ''}.`,
                type: 'success'
            });

        } catch (err) {
            console.error(err);
            setUploadStatus({ message: 'Erro ao ler arquivo Excel.', type: 'error' });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="animate-in" style={{ paddingBottom: "4rem" }}>
            <header className="page-header">
                <div className="page-header-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <button
                        onClick={() => router.push('/')}
                        className="btn-outline-round"
                        aria-label="Voltar ao dashboard"
                    >
                        ⬅️
                    </button>
                    <div style={{ minWidth: 0 }}>
                        <h1 className="page-title" style={{ fontSize: "2rem" }}>Configurações</h1>
                        <p className="page-subtitle">Ajuste privacidade, importação em lote e preferências.</p>
                    </div>
                </div>
            </header>

            <div className="settings-grid">

                {/* Card de Anonimização */}
                <div className="glass-card">
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>👀</span> Privacidade e Apresentação
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                        Ative o modo de anonimato para esconder nomes reais e descaracterizar observações. Ideal para fazer demonstrações de tela sem vazar dados sensíveis dos alunos. Essa mudança afeta apenas a interface atual, o banco de dados continua intacto.
                    </p>

                    <label className="settings-toggle-row">
                        <div
                            className="settings-switch"
                            style={{ background: isAnonymized ? "var(--primary)" : "rgba(255,255,255,0.2)" }}
                        >
                            <div
                                className="settings-switch-thumb"
                                style={{ left: isAnonymized ? "27px" : "3px" }}
                            />
                        </div>
                        <input
                            type="checkbox"
                            style={{ display: "none" }}
                            checked={isAnonymized}
                            onChange={(e) => setAnonymized(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600 }}>{isAnonymized ? "Modo Anônimo: ATIVADO" : "Modo Anônimo: DESATIVADO"}</span>
                    </label>
                </div>

                {/* Card de Importação */}
                <div className="glass-card">
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>📥</span> Importação Lote
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                        Faça upload de uma planilha do Excel (.xlsx, .xls) para importar múltiplos alunos de uma só vez. Certifique-se de que a planilha contenha colunas chamadas <strong>Nome</strong>, <strong>Turma</strong>, <strong>Série</strong>, <strong>Turno</strong> e (Opcional) <strong>Diagnóstico</strong>.
                    </p>

                    <label className="btn-outline" style={{ display: "inline-flex", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1, maxWidth: "100%", width: "fit-content" }}>
                        {loading ? "⏳ Processando Planilha..." : "Selecionar Arquivo Excel"}
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            disabled={loading}
                            style={{ display: "none" }}
                        />
                    </label>

                    {uploadStatus.message && (
                        <div
                            className="settings-status"
                            style={{
                                background: uploadStatus.type === 'success' ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                color: uploadStatus.type === 'success' ? "var(--success)" : "var(--error)",
                                border: `1px solid ${uploadStatus.type === 'success' ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                            }}
                        >
                            {uploadStatus.message}
                        </div>
                    )}

                    {/* Lista de Histórico */}
                    {history.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                🕒 Histórico Recente
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {history.map(item => (
                                    <div key={item.id} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.fileName}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {item.importedAt?.toDate ? item.importedAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '99px', fontWeight: 800 }}>
                                                {item.successCount} ok
                                            </span>
                                            {item.errorCount > 0 && (
                                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '99px', fontWeight: 800 }}>
                                                    {item.errorCount} erro
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
