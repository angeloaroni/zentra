"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Token de verificacion no proporcionado")
      return
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus("success")
          setMessage(data.message || "Email verificado correctamente")
        } else {
          setStatus("error")
          setMessage(data.message || "Error al verificar el email")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Error de conexion")
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Verificacion de email</h1>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            {status === "loading" && (
              <div className="py-8">
                <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
                <p className="text-muted-foreground">Verificando tu email...</p>
              </div>
            )}
            {status === "success" && (
              <div className="py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
                <p className="font-semibold text-lg mb-2">Email verificado</p>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>
                <Link href="/login">
                  <Button className="w-full">Iniciar sesion</Button>
                </Link>
              </div>
            )}
            {status === "error" && (
              <div className="py-8">
                <XCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                <p className="font-semibold text-lg mb-2">Error de verificacion</p>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Volver al login</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
