
import React from 'react';

const Legal = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Legal Information</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
        <p className="mb-3">
          Welcome to our application. By using this service, you agree to be bound by the following terms and conditions.
        </p>
        <p className="mb-3">
          This is a placeholder for the Terms of Service. In a production environment, this would contain the actual legal terms.
        </p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
        <p className="mb-3">
          We take your privacy seriously. This section outlines how we collect, use, and protect your data.
        </p>
        <p className="mb-3">
          This is a placeholder for the Privacy Policy. In a production environment, this would contain the actual privacy policy.
        </p>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
        <p>
          If you have any questions about our legal policies, please contact us at legal@example.com.
        </p>
      </section>
    </div>
  );
};

export default Legal;
