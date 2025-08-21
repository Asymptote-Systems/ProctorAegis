"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldX, ArrowLeft, Home } from "lucide-react"

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Icon Section */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <ShieldX className="w-12 h-12 text-muted-foreground" />
          </div>

          {/* Error Code */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-foreground tracking-tight">403</h1>
            <div className="w-16 h-0.5 bg-border mx-auto"></div>
          </div>
        </div>

        {/* Content Section */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">Access Forbidden</h2>
              <p className="text-muted-foreground leading-relaxed">
                You don't have permission to access this resource. Please contact your administrator if you believe this
                is an error.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="default" className="flex-1 gap-2" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Error Code: 403 • Forbidden Access</p>
        </div>
      </div>
    </div>
  )
}
