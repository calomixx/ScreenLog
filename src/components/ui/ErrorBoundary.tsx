// @ts-nocheck
// El proyecto no incluye @types/react, así que los genéricos de Component
// no están disponibles. Este boundary es la única pieza que requiere clase.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Nombre de la sección para el mensaje. */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Evita que un fallo en una vista deje la aplicación en blanco.
 * El resto de la shell (navbar, footer) sigue funcionando.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Sección bloqueada por un error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="text-center py-16 px-4 border border-dashed border-rose-500/25 rounded-3xl bg-[#1B1214]/60 space-y-4"
      >
        <div
          aria-hidden="true"
          className="w-14 h-14 mx-auto rounded-2xl bg-rose-600/15 text-rose-400 flex items-center justify-center border border-rose-500/25"
        >
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            No pudimos mostrar {this.props.section || 'esta sección'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            Ocurrió un error inesperado. Puedes reintentar sin recargar toda la aplicación.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }
}
