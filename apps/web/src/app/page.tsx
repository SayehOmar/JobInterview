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

  // Check auth status on mount
  // @ts-ignore
  const { loading: meLoading } = useQuery(ME_QUERY, {
    skip: typeof window === 'undefined',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !meLoading) {
      router.push('/auth');
    }
  }, [isAuthenticated, isLoading, meLoading, router]);

  if (isLoading || meLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
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