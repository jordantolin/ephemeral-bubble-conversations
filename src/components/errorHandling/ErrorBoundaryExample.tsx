
import React, { useState } from "react";
import ComponentErrorBoundary from "./ComponentErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// A component that will throw an error when the button is clicked
const BuggyCounter = () => {
  const [counter, setCounter] = useState(0);
  
  const handleClick = () => {
    setCounter(prev => prev + 1);
  };
  
  if (counter === 3) {
    // This will cause an error
    throw new Error('Simulated error at counter 3!');
  }
  
  return (
    <div className="p-4 text-center">
      <p className="mb-4">Counter: {counter}</p>
      <Button onClick={handleClick}>
        Increment Counter
      </Button>
      <p className="mt-4 text-sm text-gray-500">
        (Counter will throw an error when it reaches 3)
      </p>
    </div>
  );
};

// Example usage of the error boundary
const ErrorBoundaryExample = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Boundary Example</CardTitle>
        <CardDescription>
          This demonstrates how component errors are contained and handled gracefully
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ComponentErrorBoundary name="Counter Component">
          <BuggyCounter />
        </ComponentErrorBoundary>
      </CardContent>
      <CardFooter className="text-sm text-gray-500">
        The error is contained within this component and won't crash the entire app
      </CardFooter>
    </Card>
  );
};

export default ErrorBoundaryExample;
