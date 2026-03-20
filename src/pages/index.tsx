import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import { getWorkspaces } from '@/lib/workspace-store';
import type { IWorkspaceInitialData } from '@/hooks/use-workspace';

const TerminalPage = dynamic(
  () => import('@/components/features/terminal/terminal-page'),
  { ssr: false },
);

interface IIndexProps {
  initialWorkspace: IWorkspaceInitialData;
}

const Index = ({ initialWorkspace }: IIndexProps) => (
  <>
    <Head>
      <title>Purple Terminal</title>
    </Head>
    <div style={{ backgroundColor: '#18181b' }} className="h-screen w-screen">
      <TerminalPage initialWorkspace={initialWorkspace} />
    </div>
  </>
);

export const getServerSideProps: GetServerSideProps<IIndexProps> = async () => {
  const data = await getWorkspaces();
  return { props: { initialWorkspace: data } };
};

export default Index;
