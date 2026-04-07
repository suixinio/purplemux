import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getCachedRuntimePreflight } from '@/lib/preflight';
import { isRuntimeOk } from '@/types/preflight';

interface IRequireAuthOptions {
  skipPreflight?: boolean;
}

export const requireAuth = async <T extends Record<string, unknown>>(
  context: GetServerSidePropsContext,
  handler?: () => Promise<GetServerSidePropsResult<T>>,
  options?: IRequireAuthOptions,
): Promise<GetServerSidePropsResult<T>> => {
  const token = context.req.cookies[SESSION_COOKIE];
  if (!token || !(await verifySessionToken(token))) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  if (!options?.skipPreflight) {
    const runtime = await getCachedRuntimePreflight();
    if (!isRuntimeOk(runtime)) {
      const from = context.resolvedUrl || '/';
      return { redirect: { destination: `/tools-required?from=${encodeURIComponent(from)}`, permanent: false } };
    }
  }

  return handler ? handler() : ({ props: {} } as GetServerSidePropsResult<T>);
};
