import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ExternalLink, Award, CheckCircle2, Building2, MapPin } from 'lucide-react';
import type { GovernmentScheme } from '@/types';

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const data = await blink.db.governmentSchemes.list<GovernmentScheme>({
        where: { isActive: '1' },
        orderBy: { createdAt: 'desc' },
        limit: 100
      });
      setSchemes(data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = 
      scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      categoryFilter === 'all' || scheme.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const centralSchemes = filteredSchemes.filter(s => s.category === 'Central Scheme');
  const stateSchemes = filteredSchemes.filter(s => s.category === 'State Scheme');

  const categories = [...new Set(schemes.map(s => s.category).filter(Boolean))];
  
  const parseSteps = (howToApply: string) => {
    if (!howToApply) return [];
    return howToApply.split(/Step \d+:/).filter(step => step.trim()).map(step => step.trim());
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Government Schemes</h1>
          <p className="text-muted-foreground">
            Explore agricultural schemes and subsidies available for farmers
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search schemes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category!}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schemes Display with Tabs */}
        {loading ? (
          <div className="space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">
                All Schemes ({filteredSchemes.length})
              </TabsTrigger>
              <TabsTrigger value="central">
                <Building2 className="w-4 h-4 mr-2" />
                Central ({centralSchemes.length})
              </TabsTrigger>
              <TabsTrigger value="state">
                <MapPin className="w-4 h-4 mr-2" />
                State ({stateSchemes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {filteredSchemes.length > 0 ? (
                filteredSchemes.map((scheme) => (
                  <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center space-x-2 mb-2">
                            <Award className="w-5 h-5 text-primary" />
                            <span>{scheme.title}</span>
                          </CardTitle>
                          <CardDescription>{scheme.description}</CardDescription>
                        </div>
                        <Badge variant={scheme.category === 'Central Scheme' ? 'default' : 'secondary'} className="ml-4">
                          {scheme.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="eligibility">
                          <AccordionTrigger className="text-sm font-semibold">
                            Eligibility Criteria
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground">{scheme.eligibility}</p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="benefits">
                          <AccordionTrigger className="text-sm font-semibold">
                            Benefits & Coverage
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground">{scheme.benefits}</p>
                          </AccordionContent>
                        </AccordionItem>

                        {scheme.howToApply && (
                          <AccordionItem value="steps">
                            <AccordionTrigger className="text-sm font-semibold text-primary">
                              📋 Step-by-Step Guide to Claim
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3">
                                {parseSteps(scheme.howToApply).map((step, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 pt-1">
                                      <p className="text-sm text-foreground">{step}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>

                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                        {scheme.deadline && (
                          <Badge variant="outline" className="text-xs">
                            ⏰ Deadline: {new Date(scheme.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                        {scheme.state && scheme.state !== 'All India' && (
                          <Badge variant="outline" className="text-xs">
                            📍 {scheme.state}
                          </Badge>
                        )}
                        {scheme.officialLink && (
                          <Button variant="default" size="sm" asChild>
                            <a 
                              href={scheme.officialLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1"
                            >
                              <span>Visit Official Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No schemes found matching your criteria</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="central" className="space-y-6">
              {centralSchemes.length > 0 ? (
                <>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Central Government Schemes</h3>
                        <p className="text-sm text-muted-foreground">
                          These schemes are implemented across all states and union territories by the Government of India. 
                          Farmers from anywhere in India can apply for these schemes.
                        </p>
                      </div>
                    </div>
                  </div>
                  {centralSchemes.map((scheme) => (
                    <Card key={scheme.id} className="hover:shadow-lg transition-shadow border-primary/20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center space-x-2 mb-2">
                              <Award className="w-5 h-5 text-primary" />
                              <span>{scheme.title}</span>
                            </CardTitle>
                            <CardDescription>{scheme.description}</CardDescription>
                          </div>
                          <Badge variant="default" className="ml-4">
                            Central
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="eligibility">
                            <AccordionTrigger className="text-sm font-semibold">
                              Eligibility Criteria
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground">{scheme.eligibility}</p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="benefits">
                            <AccordionTrigger className="text-sm font-semibold">
                              Benefits & Coverage
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground">{scheme.benefits}</p>
                            </AccordionContent>
                          </AccordionItem>

                          {scheme.howToApply && (
                            <AccordionItem value="steps">
                              <AccordionTrigger className="text-sm font-semibold text-primary">
                                📋 Step-by-Step Guide to Claim
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  {parseSteps(scheme.howToApply).map((step, idx) => (
                                    <div key={idx} className="flex gap-3">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex-1 pt-1">
                                        <p className="text-sm text-foreground">
                                          <span className="font-semibold text-primary">Step {idx + 1}:</span> {step}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>

                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                          {scheme.officialLink && (
                            <Button variant="default" size="sm" asChild className="font-semibold">
                              <a 
                                href={scheme.officialLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2"
                              >
                                <span>Apply Now on Official Portal</span>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No central schemes found</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="state" className="space-y-6">
              {stateSchemes.length > 0 ? (
                <>
                  <div className="bg-secondary/50 border border-secondary rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg mb-1">State Government Schemes</h3>
                        <p className="text-sm text-muted-foreground">
                          These schemes are implemented by individual state governments. Check if your state has specific schemes 
                          that provide additional benefits to farmers.
                        </p>
                      </div>
                    </div>
                  </div>
                  {stateSchemes.map((scheme) => (
                    <Card key={scheme.id} className="hover:shadow-lg transition-shadow border-secondary">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center space-x-2 mb-2">
                              <Award className="w-5 h-5 text-primary" />
                              <span>{scheme.title}</span>
                            </CardTitle>
                            <CardDescription>{scheme.description}</CardDescription>
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            <Badge variant="secondary">
                              State
                            </Badge>
                            {scheme.state && (
                              <Badge variant="outline" className="text-xs">
                                {scheme.state}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="eligibility">
                            <AccordionTrigger className="text-sm font-semibold">
                              Eligibility Criteria
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground">{scheme.eligibility}</p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="benefits">
                            <AccordionTrigger className="text-sm font-semibold">
                              Benefits & Coverage
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground">{scheme.benefits}</p>
                            </AccordionContent>
                          </AccordionItem>

                          {scheme.howToApply && (
                            <AccordionItem value="steps">
                              <AccordionTrigger className="text-sm font-semibold text-primary">
                                📋 Step-by-Step Guide to Claim
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  {parseSteps(scheme.howToApply).map((step, idx) => (
                                    <div key={idx} className="flex gap-3">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="flex-1 pt-1">
                                        <p className="text-sm text-foreground">
                                          <span className="font-semibold text-primary">Step {idx + 1}:</span> {step}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>

                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                          {scheme.officialLink && (
                            <Button variant="default" size="sm" asChild className="font-semibold">
                              <a 
                                href={scheme.officialLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2"
                              >
                                <span>Apply Now on Official Portal</span>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No state schemes found</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
