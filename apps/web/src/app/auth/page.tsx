'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { TreePine, Leaf } from 'lucide-react';
import Image from 'next/image';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex items-center gap-3 text-[#0b4a59]">
                    <div className="w-6 h-6 border-2 border-[#0b4a59] border-t-transparent rounded-full animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-10 flex flex-col overflow-y-auto lg:flex-row bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Left Side - Branding */}
            <div
                className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 text-white"
                style={{ background: 'linear-gradient(to bottom right, #0b4a59, #0d5a6b)' }}
            >
                <div className="max-w-md text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur">
                            <Image
                                src="/reseau_symbiose_logo.jfif"
                                alt="Reseau Symbiose Logo"
                                width={50}
                                height={50}
                                className="rounded-lg"
                                priority
                            />
                        </div>
                        <h1 className="text-4xl font-bold">Forest BD</h1>
                    </div>
                    <p className="text-xl text-gray-200 mb-6">
                        Explore French forest data with interactive geospatial visualization
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <Leaf size={16} />
                            <span>BD Forêt V2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Leaf size={16} />
                            <span>Real-time analysis</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Leaf size={16} />
                            <span>Spatial queries</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="lg:w-1/2 flex items-center justify-center p-8">
                {isLogin ? (
                    <LoginForm onToggle={() => setIsLogin(false)} />
                ) : (
                    <RegisterForm onToggle={() => setIsLogin(true)} />
                )}
            </div>
        </div>
    );
}