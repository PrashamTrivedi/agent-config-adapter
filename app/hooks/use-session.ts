import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/api';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
  });
}
