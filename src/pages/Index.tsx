
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, TestTubes } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] py-12 space-y-10">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/ed011188-d039-470c-8a6e-53f000bd6f8d.png" 
            alt="tracksense logo" 
            className="h-32" 
          />
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Advanced railway crack detection using computer vision technology
        </p>
      </div>
      
      {user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link to="/record" className="w-full">
            <div className="border group rounded-lg p-6 flex flex-col items-center text-center hover:border-primary hover:bg-accent transition-colors">
              <Camera className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h2 className="text-xl font-semibold">Record Video</h2>
              <p className="text-muted-foreground mt-2">Capture railway footage with GPS tracking</p>
            </div>
          </Link>
          
          <Link to="/model-test" className="w-full">
            <div className="border group rounded-lg p-6 flex flex-col items-center text-center hover:border-primary hover:bg-accent transition-colors">
              <TestTubes className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h2 className="text-xl font-semibold">Model Testing</h2>
              <p className="text-muted-foreground mt-2">Test crack detection on individual images</p>
            </div>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-6">
          <p className="text-muted-foreground text-lg">
            Sign in to access railway crack detection features
          </p>
          <div className="flex space-x-4">
            <Link to="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
