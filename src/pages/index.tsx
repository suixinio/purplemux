import Head from 'next/head';
import dynamic from 'next/dynamic';

const TerminalPage = dynamic(
  () => import('@/components/features/terminal/terminal-page'),
  { ssr: false },
);

const Index = () => (
  <>
    <Head>
      <title>Purple Terminal</title>
    </Head>
    <div style={{ backgroundColor: '#18181b' }} className="h-screen w-screen">
      <TerminalPage />
    </div>
  </>
);

export default Index;
