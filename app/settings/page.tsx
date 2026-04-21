"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "../components/SettingsProvider";
import * as XLSX from "xlsx";
import { addAluno, Aluno } from "@/lib/services";

export default function SettingsPage() {
    const router = useRouter();
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

            const getValue = (row: any, ...keys: string[]) => {
                const rowKeys = Object.keys(row);
                const normalize = (s: string) => s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

                for (const key of keys) {
                    const target = normalize(key);
                    const foundKey = rowKeys.find(rk => normalize(rk) === target);
                    if (foundKey !== undefined) return row[foundKey];
                }
                return undefined;
            };

            for (const row of jsonData as any[]) {
                const nome = getValue(row, "nome", "name", "NOME");
                const turma = getValue(row, "turma", "class", "TURMA") || "Geral";
                const serieRaw = getValue(row, "serie", "grade", "SÉRIE", "SERIE") || "1º Ano";
                const turno = getValue(row, "turno", "shift", "TURNO") || "Manhã";
                const diagnostico = getValue(row, "diagnostico", "diagnostic", "DIAGNÓSTICO", "DIAGNOSTICO") || "Nenhum";

                // Normalização simples para série (ex: "3º" -> "3º Ano")
                let serie = String(serieRaw).trim();
                if (/^\d+º?$/.test(serie)) {
                    serie = serie.endsWith("º") ? `${serie} Ano` : `${serie}º Ano`;
                }

                if (nome) {
                    try {
                        await addAluno({
                            nome: String(nome),
                            turma: String(turma),
                            serie: serie,
                            turno: String(turno),
                            diagnostico: String(diagnostico)
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
                </div>

            </div>
        </div>
    );
}
