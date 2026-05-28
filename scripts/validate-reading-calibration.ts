type Sample = {
  name: string;
  original: string;
  transcription: string;
  expectedErrors: number;
  expectedMinPrecision: number;
};

const { calculatePCM } = await import(new URL("../lib/pcmUtils.ts", import.meta.url).href);

const correctReadingSamples: Sample[] = [
  {
    name: "Leitura idêntica",
    original: "O menino correu para a escola feliz.",
    transcription: "O menino correu para a escola feliz.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Pontuação e caixa variando",
    original: "A professora leu o texto, com calma, para a turma.",
    transcription: "a professora leu o texto com calma para a turma",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Junção de duas palavras pelo ASR",
    original: "De repente a chuva caiu forte no telhado.",
    transcription: "Derepente a chuva caiu forte no telhado.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Quebra de palavra pelo ASR",
    original: "Amanheceu cedo e o pátio ficou vazio.",
    transcription: "Amanhe ceu cedo e o patio ficou vazio.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Omissão isolada de palavra funcional",
    original: "O menino e a menina brincaram no pátio.",
    transcription: "O menino a menina brincaram no patio.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Inserção isolada de palavra funcional",
    original: "O menino correu rápido para casa.",
    transcription: "O menino e correu rapido para casa.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Repetição curta induzida por transcrição",
    original: "O menino foi ao parque com a turma.",
    transcription: "O o menino foi ao parque com a turma.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Variação leve em palavra longa",
    original: "A professora organizou a atividade coletiva.",
    transcription: "A profesora organizou a atividade coletiva.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Variação leve em final de verbo",
    original: "As crianças caminhavam felizes pela floresta.",
    transcription: "As criancas caminhavao felizes pela floresta.",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
  {
    name: "Leitura correta com pausa marcada em vírgula",
    original: "Depois do recreio, a turma voltou para a sala em silêncio.",
    transcription: "Depois do recreio a turma voltou para a sala em silencio",
    expectedErrors: 0,
    expectedMinPrecision: 100,
  },
];

const realErrorSamples: Sample[] = [
  {
    name: "Troca real de palavra de conteúdo",
    original: "O menino correu para a escola feliz.",
    transcription: "O menino pulou para a escola feliz.",
    expectedErrors: 1,
    expectedMinPrecision: 80,
  },
  {
    name: "Omissão real de palavra de conteúdo",
    original: "A professora explicou a atividade com cuidado.",
    transcription: "A professora explicou a com cuidado.",
    expectedErrors: 1,
    expectedMinPrecision: 80,
  },
  {
    name: "Repetição indevida de palavra de conteúdo",
    original: "A turma voltou para a sala em silêncio.",
    transcription: "A turma voltou sala sala em silencio.",
    expectedErrors: 2,
    expectedMinPrecision: 75,
  },
];

function validateSample(sample: Sample) {
  const metrics = calculatePCM(sample.original, sample.transcription);
  const okErrors = metrics.erros === sample.expectedErrors;
  const okPrecision = metrics.precisao >= sample.expectedMinPrecision;

  return {
    ...sample,
    metrics,
    passed: okErrors && okPrecision,
    errorMessage: okErrors
      ? ""
      : `erros esperados=${sample.expectedErrors}, obtidos=${metrics.erros}`,
    precisionMessage: okPrecision
      ? ""
      : `precisão mínima=${sample.expectedMinPrecision}, obtida=${metrics.precisao}`,
  };
}

function printGroupResult(title: string, samples: Sample[]) {
  console.log(`\n${title}`);

  const results = samples.map(validateSample);
  results.forEach((result) => {
    const status = result.passed ? "OK" : "FALHOU";
    const details = [result.errorMessage, result.precisionMessage].filter(Boolean).join(" | ");
    console.log(
      `- ${status}: ${result.name} -> erros=${result.metrics.erros}, precisão=${result.metrics.precisao}%, variações aceitas=${result.metrics.variacoes_aceitas}${details ? ` | ${details}` : ""}`
    );
  });

  return results;
}

const positiveResults = printGroupResult("Amostras corretas", correctReadingSamples);
const negativeResults = printGroupResult("Amostras com erro real", realErrorSamples);
const failed = [...positiveResults, ...negativeResults].filter(result => !result.passed);

if (failed.length > 0) {
  console.error(`\nFalhas encontradas: ${failed.length}`);
  process.exit(1);
}

console.log("\nCalibração concluída sem falsos positivos nas 10 amostras corretas.");
