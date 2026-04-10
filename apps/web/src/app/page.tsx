'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { ForestMap } from '@/components/map/ForestMap';
import { ME_QUERY } from '@/graphql/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, setLoading, setAuth, logout } = useAuthStore();

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  // Check auth status on mount
  const { loading: meLoading } = useQuery(ME_QUERY, {
    skip: !hasToken,
    onCompleted: (data) => {
      if (data?.me) {
        setAuth(data.me);
      }
      setLoading(false);
    },
    onError: () => {
      logout();
      setLoading(false);
    },
  });

  useEffect(() => {
    // If there's no token, we shouldn't block the UI in a loading state
    if (!hasToken) {
      setLoading(false);
    }

    if (!isLoading && !isAuthenticated && !meLoading) {
      router.push('/auth');
    }
  }, [hasToken, isAuthenticated, isLoading, meLoading, router, setLoading]);

  if (isLoading || meLoading) {
    return (
        <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-gray-900">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-lg">Loading map...</span>
          </div>
        </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <ForestMap />;
}