import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Pagina no encontrada</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">La pagina que buscas no existe o fue movida.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block">
          Volver al panel
        </Link>
      </div>
    </div>
  )
}
