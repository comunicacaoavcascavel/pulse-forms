import { FormSchema } from '@/types/form';

export const audicaoFormSchema: FormSchema = {
  id: 'form_001',
  slug: 'audicoes-2026',
  title: 'Audições Louvor Pulse 2026',
  description: 'Plataforma oficial de seleção e acompanhamento ministerial.',
  sections: [
    {
      id: 'sec_001',
      key: 'registration',
      title: 'Cadastro do participante',
      description: 'Preencha seus dados com atenção. Essas informações serão usadas para nosso contato.',
      order: 1,
      questions: [
        { id: 'q1', key: 'full_name', type: 'short_text', label: 'Nome completo', required: true },
        { id: 'q2', key: 'birth_date', type: 'date', label: 'Data de nascimento', required: true },
        { id: 'q3', key: 'email', type: 'email', label: 'E-mail', required: true },
        { id: 'q4', key: 'phone', type: 'phone', label: 'WhatsApp', required: true },
        { id: 'q5', key: 'social_profile_url', type: 'url', label: 'Link da rede social', description: 'Ex: https://instagram.com/seuusuario', required: true },
        { id: 'q6', key: 'cell_leader_name', type: 'short_text', label: 'Nome do(a) líder de célula', required: true },
        { id: 'q7', key: 'water_baptism', type: 'single_choice', label: 'Batismo nas águas?', required: true, options: [
          'Não sou batizado ainda',
          'Fui batizado na Pulse Igreja',
          'Fui batizado em outra denominação, mas sou membro da Pulse Igreja',
          'Fui batizado em outra denominação e não sou membro da Pulse Igreja'
        ]}
      ]
    },
    {
      id: 'sec_002',
      key: 'video_submission',
      title: 'Envio do vídeo',
      description: 'Envie o link do seu vídeo tocando ou cantando. (Não deixe o vídeo privado)',
      order: 2,
      questions: [
        { id: 'q8', key: 'audition_video_url', type: 'url', label: 'Link externo do vídeo (YouTube, Drive, etc)', required: true }
      ]
    },
    {
      id: 'sec_003',
      key: 'prerequisites',
      title: 'Pré-requisitos obrigatórios',
      description: 'Queremos caminhar com você de forma organizada. Responda com sinceridade.',
      order: 3,
      questions: [
        { id: 'q9', key: 'recepcao_novos_membros', type: 'single_choice', label: 'Você concluiu a Recepção de Novos Membros?', required: true, options: ['Sim', 'Não'] },
        { id: 'q10', key: 'curso_essencia', type: 'single_choice', label: 'Você concluiu o Curso Essência?', required: true, options: ['Sim', 'Não'] },
        { id: 'q11', key: 'retiro_transformacao', type: 'single_choice', label: 'Você concluiu o Retiro Transformação?', required: true, options: ['Sim', 'Não'] }
      ]
    }
  ]
};
