const manualReviewTemplates = [
  {
    name: 'Aderencia ao perfil esperado',
    description: 'Avalie se a pessoa atende aos requisitos e expectativas definidos para este formulario.',
    max_score: 10,
  },
  {
    name: 'Clareza e consistencia das respostas',
    description: 'Observe se as respostas sao completas, coerentes e ajudam a tomada de decisao.',
    max_score: 10,
  },
  {
    name: 'Maturidade e responsabilidade',
    description: 'Considere postura, comprometimento, disponibilidade e sinais de responsabilidade.',
    max_score: 10,
  },
];

function createBuilderId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createManualReviewCriterion(existingCount = 0) {
  const template = manualReviewTemplates[existingCount] || {
    name: `Criterio ${existingCount + 1}`,
    description: 'Descreva o que a banca deve observar ao pontuar este criterio.',
    max_score: 10,
  };

  return { ...template };
}

export function createDefaultManualReviewCriteria() {
  return manualReviewTemplates.map((template) => ({ ...template }));
}

export function createDefaultFormSections() {
  return [
    {
      id: createBuilderId('sec'),
      title: 'Dados pessoais',
      description: 'Informacoes usadas para identificar e contatar a pessoa inscrita.',
      questions: [
        {
          id: createBuilderId('q'),
          label: 'Nome completo',
          type: 'short_text',
          required: true,
          options: [],
        },
        {
          id: createBuilderId('q'),
          label: 'E-mail',
          type: 'email',
          required: true,
          options: [],
        },
        {
          id: createBuilderId('q'),
          label: 'WhatsApp',
          type: 'phone',
          required: true,
          options: [],
        },
      ],
    },
    {
      id: createBuilderId('sec'),
      title: 'Respostas principais',
      description: 'Configure aqui as perguntas especificas deste processo.',
      questions: [
        {
          id: createBuilderId('q'),
          label: 'Conte brevemente as informacoes principais para esta avaliacao',
          type: 'long_text',
          required: true,
          options: [],
        },
      ],
    },
  ];
}
