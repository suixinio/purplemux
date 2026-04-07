import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

export const requireAuth = async <T extends Record<string, unknown>>(
  context: GetServerSidePropsContext,
  handler?: () => Promise<GetServerSidePropsResult<T>>,
): Promise<GetServerSidePropsResult<T>> => {
  const token = context.req.cookies[SESSION_COOKIE];
  if (!token || !(await verifySessionToken(token))) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return handler ? handler() : ({ props: {} } as GetServerSidePropsResult<T>);
};
