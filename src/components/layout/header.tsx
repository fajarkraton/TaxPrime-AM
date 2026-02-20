'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LogOut, Menu } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase/config';
import { Sidebar } from './sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useRouter } from 'next/navigation';

export function Header() {
    const { user, role, department } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            // Hapus session cookie
            await fetch('/api/logout');
            // Redirect ke halaman login
            router.push('/login');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/70 backdrop-blur-xl px-4 md:px-6 transition-all duration-300">
            <div className="flex items-center gap-4 md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] p-0">
                        <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                        <SheetDescription className="sr-only">Navigasi aplikasi TaxPrime AM</SheetDescription>
                        <Sidebar isMobile />
                    </SheetContent>
                </Sheet>
                <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <span className="font-extrabold text-xl tracking-tight"><span className="text-primary">Tax</span><span className="text-foreground">Prime</span></span>
                    <span className="text-[11px] font-bold tracking-widest uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">AM</span>
                </Link>
            </div>
            <div className="hidden md:flex flex-1" />
            <div className="flex flex-row items-center gap-2">
                <ThemeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user?.displayName || ''} />}
                                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                                <p className="text-xs leading-none text-primary mt-1 capitalize font-semibold">
                                    {role ? role.replace('_', ' ') : 'Employee'} {department ? `• ${department}` : ''}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

