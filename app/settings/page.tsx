"use client";

import { useState } from "react";
import { useSettings } from "../components/SettingsProvider";
import * as XLSX from "xlsx";
import { addAluno, Aluno } from "@/lib/services";

export default function SettingsPage() {
    const { isAnonymized, setAnonymized } = useSettings();
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setUploadStatus({ message: 'Lendo arquivo...', type: '' });

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            let successCount = 0;
            let errorCount = 0;

            for (const row of jsonData as any[]) {
                const nome = row.nome || row.Nome || row.NOME;
                const turma = row.turma || row.Turma || row.TURMA || "Geral";
                const serie = row.serie || row.Serie || row.Série || row.SERIE || "1º Ano";
                const turno = row.turno || row.Turno || row.TURNO || "Manhã";

                if (nome) {
                    try {
                        await addAluno({
                            nome: String(nome),
                            turma: String(turma),
                            serie: String(serie),
                            turno: String(turno)
                        } as Omit<Aluno, 'id'>);
                        successCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }
            }

            setUploadStatus({
                message: `Importação concluída! ${successCount} alunos adicionados${errorCount > 0 ? ` (${errorCount} erros)` : ''}.`,
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
        <div className="animate-in" style={{ padding: "1rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Configurações</h1>
            </div>

            <div className="grid-cards" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", maxWidth: "800px" }}>

                {/* Card de Anonimização */}
                <div className="glass-card">
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>👀</span> Privacidade e Apresentação
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                        Ative o modo de anonimato para esconder nomes reais e descaracterizar observações. Ideal para fazer demonstrações de tela sem vazar dados sensíveis dos alunos. Essa mudança afeta apenas a interface atual, o banco de dados continua intacto.
                    </p>

                    <label style={{ display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer" }}>
                        <div style={{
                            position: "relative",
                            width: "50px",
                            height: "26px",
                            background: isAnonymized ? "var(--primary)" : "rgba(255,255,255,0.2)",
                            borderRadius: "13px",
                            transition: "background 0.3s"
                        }}>
                            <div style={{
                                position: "absolute",
                                top: "3px",
                                left: isAnonymized ? "27px" : "3px",
                                width: "20px",
                                height: "20px",
                                background: "white",
                                borderRadius: "50%",
                                transition: "left 0.3s",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                            }} />
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
                        Faça upload de uma planilha do Excel (.xlsx, .xls) para importar múltiplos alunos de uma só vez. Certifique-se de que a planilha contenha colunas chamadas <strong>Nome</strong>, <strong>Turma</strong>, <strong>Série</strong> e <strong>Turno</strong>.
                    </p>

                    <label className="btn-outline" style={{ display: "inline-flex", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>
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
                        <div style={{
                            marginTop: "1rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            background: uploadStatus.type === 'success' ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: uploadStatus.type === 'success' ? "var(--success)" : "var(--error)",
                            border: `1px solid ${uploadStatus.type === 'success' ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                        }}>
                            {uploadStatus.message}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
