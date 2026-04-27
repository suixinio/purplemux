/**
 * 텍스트를 클립보드에 복사한다.
 *
 * Secure context(HTTPS, localhost)에서는 표준 `navigator.clipboard.writeText`를 사용하고,
 * HTTP IP 등 비-secure context에서는 레거시 `document.execCommand('copy')`로 폴백한다.
 *
 * @returns 복사 성공 여부
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    if (typeof document === 'undefined') return false;

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
