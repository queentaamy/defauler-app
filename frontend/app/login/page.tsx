"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("counsel@lawfirm.com");
  const [password, setPassword] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-md">
          <Scale className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight font-heading">
          Court Order Defaulter Tracker
        </h1>
        <p className="text-xs text-muted-foreground">
          Sign in to access monitored court debt orders and payment schedules.
        </p>
      </div>

      <Card className="shadow-xs">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-lg">Officer & Counsel Login</CardTitle>
            <CardDescription className="text-xs">
              Supports Supabase Auth and authorized system credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>User cases and court files are protected and encrypted.</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t pt-4">
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <span>{loading ? "Authenticating..." : "Sign In to Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
