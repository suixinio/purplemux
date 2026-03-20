import "@/styles/globals.css";
import "pretendard/dist/web/static/pretendard.css";
import "@xterm/xterm/css/xterm.css";
import type { AppProps } from "next/app";
import localFont from "next/font/local";

const meslo = localFont({
  src: [
    {
      path: "../../public/fonts/MesloLGLDZNerdFont-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/MesloLGLDZNerdFont-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/MesloLGLDZNerdFont-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/MesloLGLDZNerdFont-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-meslo",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={meslo.variable}>
      <Component {...pageProps} />
    </main>
  );
}
