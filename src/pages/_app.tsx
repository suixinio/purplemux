import "@/styles/globals.css";
import "pretendard/dist/web/static/pretendard.css";
import "@xterm/xterm/css/xterm.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className="font-sans antialiased">
      <Component {...pageProps} />
    </main>
  );
}
