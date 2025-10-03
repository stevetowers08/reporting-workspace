import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const Fallback = () => {
    return (
        <div className="page-bg-light flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl flex items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        Page Not Found
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                        The page you're looking for doesn't exist or you don't have permission to access it.
                    </p>

                    <div className="space-y-2">
                        <Link to="/" className="block">
                            <Button className="w-full">
                                <Home className="h-4 w-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        </Link>

                        <Link to="/admin" className="block">
                            <Button variant="outline" className="w-full">
                                <Settings className="h-4 w-4 mr-2" />
                                Admin Panel
                            </Button>
                        </Link>
                    </div>

                    <div className="text-xs text-gray-500 pt-4 border-t">
                        <p>If you believe this is an error, please contact support.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Fallback;
