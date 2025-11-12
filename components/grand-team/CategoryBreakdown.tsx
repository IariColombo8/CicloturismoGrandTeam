import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface CategoryBreakdownProps {
  categoryCounts: {
    libre: number
    competitivo: number
    familiar: number
  }
  totalParticipants: number
}

export default function CategoryBreakdown({ categoryCounts, totalParticipants }: CategoryBreakdownProps) {
  const getPercentage = (count: number) => {
    if (totalParticipants === 0) return 0
    return Math.round((count / totalParticipants) * 100)
  }

  return (
    <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mt-8">
      <CardHeader>
        <CardTitle className="text-white">Distribución por Categoría</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Libre</span>
            <span className="text-white font-semibold">
              {categoryCounts.libre} ({getPercentage(categoryCounts.libre)}%)
            </span>
          </div>
          <Progress value={getPercentage(categoryCounts.libre)} className="h-2 bg-zinc-800">
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${getPercentage(categoryCounts.libre)}%` }}
            />
          </Progress>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Competitivo</span>
            <span className="text-white font-semibold">
              {categoryCounts.competitivo} ({getPercentage(categoryCounts.competitivo)}%)
            </span>
          </div>
          <Progress value={getPercentage(categoryCounts.competitivo)} className="h-2 bg-zinc-800">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${getPercentage(categoryCounts.competitivo)}%` }}
            />
          </Progress>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Familiar</span>
            <span className="text-white font-semibold">
              {categoryCounts.familiar} ({getPercentage(categoryCounts.familiar)}%)
            </span>
          </div>
          <Progress value={getPercentage(categoryCounts.familiar)} className="h-2 bg-zinc-800">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${getPercentage(categoryCounts.familiar)}%` }}
            />
          </Progress>
        </div>

        <div className="pt-4 border-t border-yellow-400/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-yellow-400">Total Participantes</span>
            <span className="text-2xl font-black text-white">{totalParticipants}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
