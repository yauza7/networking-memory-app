import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("App crashed:", error, info);
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem("splashShown");
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#EEF6FF" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(255,59,48,0.12)" }}
        >
          <span style={{ fontSize: 32 }}>⚠️</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>
          Что-то пошло не так
        </h1>
        <p style={{ fontSize: 14, color: "#8E8E93", maxWidth: 320, marginBottom: 24 }}>
          Приложение столкнулось с непредвиденной ошибкой. Попробуйте перезагрузить — данные сохранены локально.
        </p>
        <button
          onClick={this.handleReload}
          className="rounded-[14px] text-white font-semibold transition-all active:scale-97 px-6"
          style={{
            background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
            height: 48,
            fontSize: 16,
            boxShadow: "0 4px 16px rgba(0,122,255,0.35)",
          }}
        >
          Перезагрузить
        </button>
      </div>
    );
  }
}
