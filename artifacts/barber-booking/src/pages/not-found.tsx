import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-8xl font-bold text-slate-200">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">Page not found</h1>
        <p className="mt-2 text-slate-500">This page doesn't exist.</p>
        <Link href="/" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-blue-500 transition-colors">
          Back to home
        </Link>
      </div>
    </div>
  );
}
