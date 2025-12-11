import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { getCurrentStage, getNextStage, getAllStages, getDaysToHarvest, CareStage } from '@/utils/cropCareStages';

interface CropCareTimelineProps {
  cropName: string;
  plantingDate: string; // ISO date string
}

export default function CropCareTimeline({ cropName, plantingDate }: CropCareTimelineProps) {
  // Calculate days since planting
  const plantedDate = new Date(plantingDate);
  const today = new Date();
  const daysSincePlanting = Math.floor((today.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Get current and next stages
  const currentStage = getCurrentStage(cropName, daysSincePlanting);
  const nextStage = getNextStage(cropName, daysSincePlanting);
  const allStages = getAllStages(cropName);
  const daysToHarvest = getDaysToHarvest(cropName, daysSincePlanting);
  
  // Calculate progress percentage
  const totalDuration = allStages[allStages.length - 1]?.days.end || 90;
  const progressPercentage = Math.min(100, (daysSincePlanting / totalDuration) * 100);
  
  return (
    <div className="space-y-6">
      {/* Header Card with Progress */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl capitalize">{cropName} Care Guide</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Planted: {plantedDate.toLocaleDateString()}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-semibold">Day {daysSincePlanting}</span>
                </div>
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className="w-4 h-4 mr-2" />
              {daysToHarvest} days to harvest
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Growth Progress</span>
              <span className="font-semibold">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {daysSincePlanting} of {totalDuration} days completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Stage Card */}
      {currentStage && (
        <Card className="border-primary/50 shadow-lg">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{currentStage.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">Current Stage</Badge>
                  <span className="text-xs text-muted-foreground">{currentStage.dayRange}</span>
                </div>
                <CardTitle className="mt-1">{currentStage.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Activities */}
            <div>
              <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Activities to Perform
              </h3>
              <ul className="space-y-2">
                {currentStage.activities.map((activity, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            {currentStage.tips && currentStage.tips.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  💡 Important Tips
                </h3>
                <ul className="space-y-1.5">
                  {currentStage.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {currentStage.warnings && currentStage.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong className="block mb-1">⚠️ Important Warnings:</strong>
                  <ul className="space-y-1 text-sm">
                    {currentStage.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Stage Preview */}
      {nextStage && (
        <Card className="border-muted">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="text-2xl opacity-60">{nextStage.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Coming Next</Badge>
                  <span className="text-xs text-muted-foreground">{nextStage.dayRange}</span>
                </div>
                <CardTitle className="mt-1 text-muted-foreground">{nextStage.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Get ready for the next stage in {nextStage.days.start - daysSincePlanting} days
            </p>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Upcoming Activities:</h4>
              <ul className="space-y-1.5">
                {nextStage.activities.slice(0, 3).map((activity, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                    <span>{activity}</span>
                  </li>
                ))}
                {nextStage.activities.length > 3 && (
                  <li className="text-xs text-muted-foreground italic pl-3.5">
                    + {nextStage.activities.length - 3} more activities
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Growth Timeline</CardTitle>
          <CardDescription>All stages from planting to harvest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allStages.map((stage, index) => {
              const isCompleted = daysSincePlanting > stage.days.end;
              const isCurrent = currentStage?.name === stage.name;
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-primary/5 border-primary/50 shadow-md'
                      : isCompleted
                      ? 'bg-muted/20 border-muted opacity-60'
                      : 'bg-background border-border'
                  }`}
                >
                  {/* Icon and Status */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`text-2xl ${isCompleted ? 'opacity-50' : ''}`}>
                      {stage.icon}
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                    {isCurrent && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${isCurrent ? 'text-primary' : ''}`}>
                        {stage.name}
                      </h3>
                      <Badge variant={isCurrent ? 'default' : 'outline'} className="text-xs">
                        {stage.dayRange}
                      </Badge>
                    </div>
                    
                    {/* Show activities only for current and upcoming stages */}
                    {!isCompleted && (
                      <ul className="mt-2 space-y-1">
                        {stage.activities.slice(0, 2).map((activity, actIndex) => (
                          <li key={actIndex} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{activity}</span>
                          </li>
                        ))}
                        {stage.activities.length > 2 && (
                          <li className="text-xs text-muted-foreground/60 italic pl-3">
                            +{stage.activities.length - 2} more...
                          </li>
                        )}
                      </ul>
                    )}
                    
                    {isCompleted && (
                      <p className="text-xs text-muted-foreground mt-1">✓ Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
