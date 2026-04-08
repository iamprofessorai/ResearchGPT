import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Shield, AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Check if it's a Firestore permission error (which we wrap in JSON)
    let errorDetails = null;
    try {
      if (error.message.startsWith('{')) {
        errorDetails = JSON.parse(error.message);
      }
    } catch (e) {
      // Not a JSON error
    }

    this.setState({
      error,
      errorInfo: errorDetails ? JSON.stringify(errorDetails, null, 2) : error.stack || null
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isFirestoreError = this.state.error?.message.includes('permission') || this.state.error?.message.startsWith('{');

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6 font-sans">
          <Card className="max-w-2xl w-full border-destructive/50 bg-destructive/5 backdrop-blur-xl overflow-hidden">
            <div className="h-1 bg-destructive" />
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-none bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tighter text-destructive">
                    {isFirestoreError ? 'Security Protocol Violation' : 'Kernel Panic'}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {isFirestoreError ? 'Access Denied / Permission Insufficient' : 'Unexpected Runtime Exception'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium leading-relaxed">
                  The system encountered a critical failure while executing the current operation. 
                  {isFirestoreError ? ' This usually indicates a mismatch between your account permissions and the requested resource.' : ' This may be due to a synchronization issue or a temporary service interruption.'}
                </p>
                
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-destructive/20 to-transparent opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                  <pre className="relative p-4 bg-black/90 dark:bg-black text-destructive-foreground/90 font-mono text-[10px] overflow-auto max-h-[300px] border border-destructive/20">
                    <code>{this.state.error?.message}</code>
                    {this.state.errorInfo && (
                      <div className="mt-4 pt-4 border-t border-destructive/20 opacity-70">
                        {this.state.errorInfo}
                      </div>
                    )}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1 rounded-none h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-[10px]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reboot System
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1 rounded-none h-12 border-destructive/20 hover:bg-destructive/10 font-black uppercase tracking-widest text-[10px]"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Base
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
                <Shield className="w-3 h-3" />
                <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Nexus Security Core</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
