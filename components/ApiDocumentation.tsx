import React, { useState } from 'react';
import { Terminal, Copy, Check, ChevronRight, Hash, Globe, Shield, Lock, Zap, Server, Code, FileText, Layout, Play, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const ApiDocumentation = () => {
    const [activeSection, setActiveSection] = useState('getting-started');
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedSnippet(code);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const sections = [
        { id: 'getting-started', label: 'Getting Started', icon: Play },
        { id: 'authentication', label: 'Authentication', icon: Lock },
        { id: 'orders', label: 'Orders', icon: Layout },
        { id: 'quotes', label: 'Quotes', icon: Hash },
        { id: 'webhooks', label: 'Webhooks', icon: Radio },
        { id: 'errors', label: 'Errors', icon: AlertCircle },
    ];

    const CodeBlock = ({ language, code }: { language: string, code: string }) => (
        <div className="relative group bg-slate-950 rounded-lg overflow-hidden border border-white/5 my-4">
            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => handleCopy(code)}
                    className="p-1.5 text-xs text-slate-400 hover:text-white bg-white/10 rounded backdrop-blur-md border border-white/10 flex items-center gap-1"
                >
                    {copiedSnippet === code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedSnippet === code ? 'Copied' : 'Copy'}
                </button>
            </div>
            <div className="flex items-center px-4 py-2 border-b border-white/5 bg-slate-900/50">
                <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                </div>
                <span className="ml-4 text-[10px] font-mono text-slate-500 uppercase">{language}</span>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                    {code}
                </pre>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-slate-900 text-white pb-24 pt-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex items-center space-x-2 mb-6">
                        <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold uppercase tracking-wider">Developer & API</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">API Reference</h1>
                    <p className="text-xl text-slate-400 max-w-2xl font-light">
                        Integrate AXON's autonomous logistics network directly into your application. Create orders, track shipments, and receive real-time webhook events.
                    </p>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 -mt-16 mb-20 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[800px] flex flex-col md:flex-row">
                    {/* Sidebar navigation */}
                    <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex-shrink-0">
                        <div className="p-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Documentation</h3>
                            <nav className="space-y-1">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                                            ? 'bg-white text-brand-600 shadow-sm border border-slate-100'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                            }`}
                                    >
                                        <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-brand-500' : 'text-slate-400'}`} />
                                        <span>{section.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="p-6 border-t border-slate-100">
                            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                                <h4 className="text-brand-900 font-bold text-sm mb-1">Need help?</h4>
                                <p className="text-xs text-brand-700/80 mb-3">Join our developer community for support.</p>
                                <a href="mailto:api@AXON.co.ke" className="text-xs font-bold text-brand-600 hover:text-brand-700">Contact Support →</a>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto max-h-[800px] p-8 md:p-12 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-3xl"
                            >
                                {activeSection === 'getting-started' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Getting Started</h2>
                                            <p className="text-slate-600 leading-relaxed">
                                                The AXON API is organized around REST. Our API has predictable resource-oriented URLs, accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                                                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-brand-600 mb-4 border border-slate-100"><Globe className="w-5 h-5" /></div>
                                                <h3 className="font-bold text-slate-900 mb-2">Base URL</h3>
                                                <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700 font-mono">https://us-central1-AXON-kenya.cloudfunctions.net/v1</code>
                                            </div>
                                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors">
                                                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-brand-600 mb-4 border border-slate-100"><Server className="w-5 h-5" /></div>
                                                <h3 className="font-bold text-slate-900 mb-2">Status</h3>
                                                <div className="flex items-center space-x-2">
                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                    <span className="text-sm text-slate-600 font-medium">Operational</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'authentication' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Authentication</h2>
                                            <p className="text-slate-600 leading-relaxed mb-6">
                                                The AXON API uses API keys to authenticate requests. You can view and manage your API keys in the <Link to="/business-dashboard" className="text-brand-600 font-bold hover:underline">Business Dashboard</Link>.
                                            </p>
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-900 mb-8">
                                                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm">
                                                    <strong className="block mb-1">Keep your keys safe</strong>
                                                    Your API keys carry many privileges, so be sure to keep them secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-3">Authorization Header</h3>
                                            <p className="text-slate-600 mb-4">
                                                Authentication to the API is performed via HTTP Basic Auth. Provide your API key as the basic auth username value. You do not need to provide a password.
                                            </p>
                                            <CodeBlock
                                                language="bash"
                                                code={`curl https://us-central1-AXON-kenya.cloudfunctions.net/v1/orders \\
  -H "Authorization: Bearer sk_test_..." \\
  -d pickup="Westlands"`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'orders' && (
                                    <div className="space-y-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <h2 className="text-3xl font-bold text-slate-900">Orders</h2>
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold">/v1/orders</span>
                                            </div>
                                            <p className="text-slate-600 leading-relaxed mb-8">
                                                Orders represent a delivery request in the system. They track the lifestyle of a package from pickup to delivery.
                                            </p>

                                            {/* CREATE ORDER */}
                                            <div className="border-b border-slate-100 pb-12 mb-12">
                                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-wide mr-3">POST</span>
                                                    Create Order
                                                </h3>
                                                <p className="text-slate-600 mb-6 text-sm">Creates a new delivery order. The system will immediately attempt to match a driver.</p>

                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Parameters</h4>
                                                <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-slate-50 text-slate-500 font-medium">
                                                            <tr>
                                                                <th className="px-4 py-3 border-b border-slate-200">Field</th>
                                                                <th className="px-4 py-3 border-b border-slate-200">Type</th>
                                                                <th className="px-4 py-3 border-b border-slate-200">Required</th>
                                                                <th className="px-4 py-3 border-b border-slate-200">Description</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">pickup</td>
                                                                <td className="px-4 py-3 text-slate-500">string</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">Pickup location address or coordinates.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">dropoff</td>
                                                                <td className="px-4 py-3 text-slate-500">string</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">Dropoff location address or coordinates.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">recipient</td>
                                                                <td className="px-4 py-3 text-slate-500">object</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">See <span className="font-mono text-xs">Recipient Object</span> below.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">items</td>
                                                                <td className="px-4 py-3 text-slate-500">object</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">Object with `description` (Required), `weightKg`, `fragile`.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">vehicle</td>
                                                                <td className="px-4 py-3 text-slate-500">string</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">One of: `Boda Boda`, `Tuk-Tuk`, `Vehicle`.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">serviceType</td>
                                                                <td className="px-4 py-3 text-slate-500">string</td>
                                                                <td className="px-4 py-3 text-amber-600 font-bold">Yes</td>
                                                                <td className="px-4 py-3 text-slate-700">`Standard`, `Express`, or `Freight`.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">scheduled</td>
                                                                <td className="px-4 py-3 text-slate-500">boolean</td>
                                                                <td className="px-4 py-3 text-slate-400">Optional</td>
                                                                <td className="px-4 py-3 text-slate-700">Set to true for later dating.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">pickupTime</td>
                                                                <td className="px-4 py-3 text-slate-500">string</td>
                                                                <td className="px-4 py-3 text-slate-400">Optional</td>
                                                                <td className="px-4 py-3 text-slate-700">ISO 8601 Date string if scheduled.</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-4 py-3 font-mono text-xs text-brand-600">stops</td>
                                                                <td className="px-4 py-3 text-slate-500">array</td>
                                                                <td className="px-4 py-3 text-slate-400">Optional</td>
                                                                <td className="px-4 py-3 text-slate-700">List of <span className="font-mono text-xs">Stop Objects</span> (waypoints).</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Recipient Object</h4>
                                                <div className="overflow-hidden rounded-xl border border-slate-200 mb-6 font-mono text-xs">
                                                    <div className="bg-slate-50 p-3 text-slate-600">
                                                        {`{
  "name": "Jane Doe",
  "phone": "+2547...",     // Required
  "id_number": "12345678" // Optional but recommended
}`}
                                                    </div>
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Stop Object</h4>
                                                <div className="overflow-hidden rounded-xl border border-slate-200 mb-6 font-mono text-xs">
                                                    <div className="bg-slate-50 p-3 text-slate-600">
                                                        {`{
  "address": "Sarit Center", // Required
  "type": "pickup",          // 'pickup' or 'dropoff' (Required)
  "name": "Shop Manager",    // Contact Person
  "phone": "+2547..."        // Contact Phone
}`}
                                                    </div>
                                                </div>

                                                <CodeBlock
                                                    language="json"
                                                    code={`// Request
POST /v1/orders
{
  "pickup": "Westlands, Nairobi",
  "dropoff": "CBD, Nairobi",
  "vehicle": "Boda Boda",
  "serviceType": "Express",
  "items": {
     "description": "Box of electronics",
     "weightKg": 5,
     "fragile": true
  },
  "scheduled": true,
  "pickupTime": "2024-12-25T10:00:00Z",
  "recipient": {
    "name": "John Doe",
    "phone": "+254712345678"
  },
  "stops": [
    {
       "address": "Sarit Center",
       "type": "pickup",
       "name": "Supplier A",
       "phone": "+254700111222"
    }
  ]
}

// Response
{
  "id": "ord_8sa89d7s89",
  "object": "order",
  "status": "pending",
  "created": 1678901234,
  "tracking_url": "https://AXON.co.ke/track/ord_8sa89d7s89"
}`}
                                                />
                                            </div>

                                            {/* PATCH ORDER */}
                                            <div className="border-b border-slate-100 pb-12 mb-12">
                                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-wide mr-3">PATCH</span>
                                                    Update Order
                                                </h3>
                                                <p className="text-slate-600 mb-6 text-sm">Modify an active order. Strict lifecycle guardrails apply to ensure logistical integrity.</p>

                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                                                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Lifecycle Restrictions</h5>
                                                    <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                                                        <li><strong>pickup</strong>: Cannot change after `driver_assigned`.</li>
                                                        <li><strong>vehicle / scheduled</strong>: Cannot change after `driver_assigned`.</li>
                                                        <li><strong>dropoff / recipient / items</strong>: Can be initialized until `delivered`.</li>
                                                    </ul>
                                                </div>

                                                <CodeBlock
                                                    language="json"
                                                    code={`// Request
PATCH /v1/orders/ord_8sa89d7s89
{
  "dropoff": "Westlands, Nairobi",
  "items": {
     "description": "Updated description",
     "fragile": true
  },
  "recipient": {
     "phone": "+254700000000"
  }
}

// Response
{
  "id": "ord_8sa89d7s89",
  "object": "order",
  "status": "driver_assigned",
  "updated": true,
  "changes": ["dropoff", "items", "recipient", "price"],
  "new_price": 450
}`}
                                                />
                                            </div>

                                            {/* GET ORDER */}
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wide mr-3">GET</span>
                                                    Retrieve Order
                                                </h3>
                                                <p className="text-slate-600 mb-6 text-sm">Retrieves the details of an existing order. You need only supply the unique order identifier that was returned upon order creation.</p>
                                                <CodeBlock
                                                    language="bash"
                                                    code={`GET /v1/orders/ord_8sa89d7s89`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'quotes' && (
                                    <div className="space-y-8">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <h2 className="text-3xl font-bold text-slate-900">Quotes</h2>
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold">/v1/quotes</span>
                                            </div>
                                            <p className="text-slate-600 leading-relaxed mb-6">
                                                Get a price estimate for a delivery before creating an order.
                                            </p>
                                            <CodeBlock
                                                language="json"
                                                code={`// Request
POST /v1/quotes
{
  "pickup": "Westlands",
  "dropoff": "Kilimani",
  "vehicle": "Boda Boda",
  "serviceType": "Standard"
}

// Response
{
  "object": "quote",
  "amount": 250,
  "currency": "KES",
  "estimated_delivery_time": "45 mins",
  "expires_at": "2023-01-01T12:05:00Z"
}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'webhooks' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Webhooks</h2>
                                            <p className="text-slate-600 leading-relaxed mb-6">
                                                Listen for real-time events on your server. When an event occurs, we'll send a POST request to your configured URL.
                                            </p>

                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Event Types</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    ['order.created', 'Occurs when a new order is successfully created.'],
                                                    ['order.updated', 'Occurs when price or route changes after creation.'],
                                                    ['order.cancelled', 'Occurs when an order is cancelled.'],
                                                    ['fulfillment.allocated', 'Occurs when a driver accepts the order.'],
                                                    ['fulfillment.reallocated', 'Occurs when the driver is switched.'],
                                                    ['fulfillment.arrived_pickup', 'Occurs when driver arrives at pickup location.'],
                                                    ['fulfillment.picked_up', 'Occurs when the driver picks up the package.'],
                                                    ['fulfillment.arrived_stop', 'Occurs when driver arrives at a waypoint stop.'],
                                                    ['fulfillment.completed_stop', 'Occurs when a stop action (pickup/drop) is done.'],
                                                    ['fulfillment.arrived_dropoff', 'Occurs when driver arrives at destination.'],
                                                    ['fulfillment.completed', 'Occurs when the package is delivered.'],
                                                    ['fulfillment.failed', 'Occurs when delivery fails.'],
                                                    ['payment.succeeded', 'Occurs when payment is successfully captured.'],
                                                    ['payment.failed', 'Occurs when payment processing fails.'],
                                                ].map(([event, desc]) => (
                                                    <div key={event} className="flex items-start p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="w-2 h-2 mt-2 bg-brand-500 rounded-full mr-3 flex-shrink-0"></div>
                                                        <div>
                                                            <div className="font-mono text-sm font-bold text-slate-900 mb-1">{event}</div>
                                                            <div className="text-sm text-slate-500">{desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 mt-8">Sample Webhook Payload</h4>
                                            <p className="text-slate-600 mb-4 text-sm">Example of a <code>fulfillment.arrived_stop</code> event for a multi-stop route.</p>
                                            <CodeBlock
                                                language="json"
                                                code={`{
  "id": "evt_2498239482",
  "object": "event",
  "type": "fulfillment.arrived_stop",
  "created": 1678901234,
  "data": {
    "order_id": "ord_8sa89d7s89",
    "stop_index": 2, // 0-based index of stops
    "stop_details": {
       "address": "Sarit Center, Nairobi",
       "type": "pickup",
       "name": "Supplier A",
       "phone": "+254700111222"
    },
    "driver": {
       "name": "Alois",
       "phone": "+254712345678",
       "plate": "KMD 123J"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'errors' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Errors</h2>
                                            <p className="text-slate-600 mb-6">
                                                AXON uses conventional HTTP response codes to indicate the success or failure of an API request.
                                            </p>
                                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                                        <tr>
                                                            <th className="px-4 py-3 border-b border-slate-200">Code</th>
                                                            <th className="px-4 py-3 border-b border-slate-200">Meaning</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        <tr>
                                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">200 - OK</td>
                                                            <td className="px-4 py-3 text-slate-700">Request was successful.</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">400 - Bad Request</td>
                                                            <td className="px-4 py-3 text-slate-700">The request was unacceptable (e.g. missing fields).</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">401 - Unauthorized</td>
                                                            <td className="px-4 py-3 text-slate-700">No valid API key provided.</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">404 - Not Found</td>
                                                            <td className="px-4 py-3 text-slate-700">The requested resource doesn't exist.</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Footer Area with links back */}
            <div className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-slate-400 text-sm">© {new Date().getFullYear()} AXON Kenya Ltd. Platform Documentation.</p>
                </div>
            </div>
        </div>
    );
};

// Icon needed for Radio replacement
const Radio = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
);

export default ApiDocumentation;