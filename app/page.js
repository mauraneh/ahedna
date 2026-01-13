'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    // Check API health
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus('ok');
        // Load chapters
        fetch('/api/history/chapters')
          .then(res => res.json())
          .then(data => setChapters(data.chapters || []))
          .catch(() => {});
      })
      .catch(() => setApiStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 bg-clip-text text-transparent">
                AHEDNA
              </h1>
              <p className="text-sm text-gray-600 mt-1">Dordogne & Nouvelle-Aquitaine</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                apiStatus === 'ok' ? 'bg-green-100 text-green-800' : 
                apiStatus === 'error' ? 'bg-red-100 text-red-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {apiStatus === 'ok' ? '✓ API Active' : apiStatus === 'error' ? '✗ API Error' : '○ Checking...'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-block mb-8 px-6 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            Backend Next.js API
          </div>
          <h2 className="text-6xl font-extrabold text-gray-900 mb-6">
            Association des Harkis
          </h2>
          <p className="text-2xl text-gray-600 mb-8">
            Site complet avec Angular 20 + Next.js + PostgreSQL
          </p>
          <div className="flex justify-center space-x-4">
            <a 
              href="https://harkis-history.preview.emergentagent.com/api/health" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all shadow-xl">
              🔌 Tester l&apos;API
            </a>
            <button
              onClick={() => alert('Pour démarrer Angular:\n\ncd /app/frontend-angular\nyarn ng serve --host 0.0.0.0 --port 4200\n\nOu utilisez: bash /app/start-angular.sh')}
              className="bg-red-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-red-700 transform hover:scale-105 transition-all shadow-xl">
              🚀 Démarrer Angular
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Backend API</h3>
            <p className="text-gray-600 mb-4">
              Next.js avec PostgreSQL, authentification JWT, et API REST complète
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ Auth (register, login, JWT)</li>
              <li>✓ Histoire interactive</li>
              <li>✓ Actualités & Événements</li>
              <li>✓ Forum & Galerie</li>
              <li>✓ Espace Admin complet</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Frontend Angular</h3>
            <p className="text-gray-600 mb-4">
              Angular 20 avec Tailwind CSS et animations immersives
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ Standalone components</li>
              <li>✓ Guards & Interceptors</li>
              <li>✓ Routing complet</li>
              <li>✓ Design moderne</li>
              <li>✓ Responsive & accessible</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="text-5xl mb-4">🗄️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Base de Données</h3>
            <p className="text-gray-600 mb-4">
              PostgreSQL avec schéma complet et données d&apos;exemple
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>✓ Users & Roles</li>
              <li>✓ News & Events</li>
              <li>✓ Forum & Gallery</li>
              <li>✓ History chapters</li>
              <li>✓ Memberships</li>
            </ul>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">État de l&apos;API</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Endpoints Disponibles</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">POST /api/auth/register</code></li>
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">POST /api/auth/login</code></li>
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">GET /api/news</code></li>
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">GET /api/events</code></li>
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">GET /api/forum/topics</code></li>
                <li>✓ <code className="bg-gray-100 px-2 py-1 rounded">GET /api/history/chapters</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Compte Admin</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Email:</strong> admin@ahedna.fr
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Mot de passe:</strong> admin123
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Rôle:</strong> admin
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ⚠️ Changez ce mot de passe en production
              </p>
            </div>
          </div>
        </div>

        {/* History Chapters Preview */}
        {chapters.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Chapitres d&apos;Histoire ({chapters.length})
            </h3>
            <div className="space-y-4">
              {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border border-gray-200 rounded-xl p-4 hover:border-red-300 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-red-600 font-semibold mb-1">
                        {chapter.year_start}{chapter.year_end && chapter.year_end !== chapter.year_start ? ` - ${chapter.year_end}` : ''}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{chapter.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{chapter.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">🚀 Comment démarrer l&apos;application complète</h3>
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="font-semibold mb-2">1. Méthode Rapide (Script automatique)</p>
              <code className="block bg-black/30 rounded px-4 py-2 text-sm font-mono">
                bash /app/start-angular.sh
              </code>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="font-semibold mb-2">2. Méthode Manuelle</p>
              <code className="block bg-black/30 rounded px-4 py-2 text-sm font-mono mb-2">
                cd /app/frontend-angular
              </code>
              <code className="block bg-black/30 rounded px-4 py-2 text-sm font-mono">
                yarn ng serve --host 0.0.0.0 --port 4200
              </code>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="font-semibold mb-2">3. Accès</p>
              <p className="text-sm">
                Frontend Angular: <code className="bg-black/30 px-2 py-1 rounded">http://localhost:4200</code><br/>
                Backend API: <code className="bg-black/30 px-2 py-1 rounded">http://localhost:3000/api</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h4 className="text-xl font-bold mb-2">AHEDNA</h4>
          <p className="text-gray-400 text-sm">
            Association des Harkis et de leurs Enfants<br/>
            Dordogne et Nouvelle-Aquitaine
          </p>
          <p className="text-gray-500 text-xs mt-4">© 2025 AHEDNA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
