import Document, { Html, Head, Main, NextScript, type DocumentContext, type DocumentInitialProps } from 'next/document';
import { getWorkspaces } from '@/lib/workspace-store';
import { getConfig } from '@/lib/config-store';

interface IDocumentProps extends DocumentInitialProps {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  agentEnabled: boolean;
  editorUrl: string;
  dangerouslySkipPermissions: boolean;
  hasAuthPassword: boolean;
}

class MyDocument extends Document<IDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<IDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    const defaults = {
      sidebarWidth: 200,
      sidebarCollapsed: false,
      agentEnabled: false,
      editorUrl: '',
      dangerouslySkipPermissions: false,
      hasAuthPassword: false,
    };
    try {
      const [wsData, cfgData] = await Promise.all([getWorkspaces(), getConfig()]);
      return {
        ...initialProps,
        sidebarWidth: wsData.sidebarWidth,
        sidebarCollapsed: wsData.sidebarCollapsed,
        agentEnabled: cfgData.agentEnabled ?? false,
        editorUrl: cfgData.editorUrl ?? '',
        dangerouslySkipPermissions: cfgData.dangerouslySkipPermissions ?? false,
        hasAuthPassword: !!cfgData.authPassword,
      };
    } catch {
      return { ...initialProps, ...defaults };
    }
  }

  render() {
    const { sidebarWidth, sidebarCollapsed, agentEnabled, editorUrl, dangerouslySkipPermissions, hasAuthPassword } = this.props;
    const effectiveWidth = sidebarCollapsed ? 0 : sidebarWidth;
    const effectiveMinWidth = sidebarCollapsed ? 0 : 160;

    const initScript = [
      `window.__SB__={w:${sidebarWidth},c:${sidebarCollapsed}}`,
      `window.__CFG__={ae:${agentEnabled},eu:${JSON.stringify(editorUrl)},dsp:${dangerouslySkipPermissions},hap:${hasAuthPassword}}`,
    ].join(';');

    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <meta name="msapplication-TileColor" content="#ffffff" />
          <meta name="theme-color" content="#ffffff" />
          <style dangerouslySetInnerHTML={{ __html: `:root{--initial-sb-w:${effectiveWidth}px;--initial-sb-mw:${effectiveMinWidth}px}` }} />
          <script dangerouslySetInnerHTML={{ __html: initScript }} />
        </Head>
        <body className="antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
