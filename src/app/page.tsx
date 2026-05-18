import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function WelcomePage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-2xl w-full z-10">
        <div className="text-center mb-10">
          {/* Logo Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black border border-primary/20 shadow-glow-inner mb-6">
             <svg className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-primary">
            Audições Louvor Pulse 2k26
          </h1>
          <p className="text-muted text-lg">
            Plataforma oficial de seleção e acompanhamento ministerial.
          </p>
        </div>

        <Card glow className="text-center p-8 md:p-12 relative overflow-hidden">
           {/* Ponto de luz no topo direito */}
           <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full blur-xl opacity-60"></div>

          <h2 className="text-2xl font-bold mb-6">Bem-vindo(a) ao processo!</h2>
          
          <div className="space-y-6 text-gray-300 mb-10 text-left">
            <p className="leading-relaxed">
              Estamos muito felizes com o seu desejo de servir no Ministério de Louvor. Este formulário é o primeiro passo para conhecermos um pouco mais sobre sua história, seu chamado, sua vida com Deus e suas habilidades musicais.
            </p>
            <p className="leading-relaxed">
              O processo é dividido em algumas etapas. Separe em média <strong>15 a 20 minutos</strong> para responder com calma. Em uma das etapas, será necessário enviar um <strong>vídeo cantando ou tocando</strong>.
            </p>
            
            <div className="bg-black/30 border border-primary/20 rounded-xl p-5 flex gap-4 mt-6 items-start shadow-glow-inner">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <div>
                <h4 className="font-semibold text-gray-200 text-sm mb-1">Aviso de Sigilo Ministerial</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Todas as informações fornecidas neste formulário são estritamente confidenciais. Elas serão lidas de forma cuidadosa exclusivamente pela liderança e pastores responsáveis.
                </p>
              </div>
            </div>
          </div>

          <Link href="/f/audicoes-2026">
            <Button variant="gradient" className="w-full md:w-auto md:px-12 py-4 text-lg">
              Iniciar Inscrição
            </Button>
          </Link>
        </Card>
        
        <p className="text-center text-muted text-sm mt-8">
          Pulse Forms &copy; 2026. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
