import { useState, useEffect } from 'react';

export default function App() {
  // Page 2 State : Niche & Règles
  const [niche, setNiche] = useState('Immobilier');
  const [rules, setRules] = useState('');
  
  // Page 3 State : Générateur & Tableaux
  const [subject, setSubject] = useState('');
  const [posts, setPosts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  // Simulation de la connexion OAuth de la Page 1
  const handleFacebookConnect = () => {
    window.location.href = '/api/auth/facebook';
  };

  // Déclencher manuellement OpenAI pour un post
  const generatePost = async () => {
    if (!subject) return alert("Indiquez un sujet du jour !");
    setLoading(true);
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject })
      });
      const data = await res.json();
      if (data.success) {
        setPosts([data.post, ...posts]);
        setSubject('');
      }
    } catch (err) {
      alert("Erreur lors de la génération");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* HEADER AVEC LOGO ET PAGE 1 (OAUTH) */}
      <header className="border-b border-gray-800 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="NEXUS Logo" className="h-10 w-auto rounded-lg shadow-md bg-gray-800 p-1" />
          <div>
            <h1 className="text-2xl font-black tracking-wider text-indigo-400">NEXUS</h1>
            <p className="text-xs text-gray-400">Social Media AI Core</p>
          </div>
        </div>
        
        <button 
          onClick={handleFacebookConnect} 
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
            isFacebookConnected 
              ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
          {isFacebookConnected ? 'Profil Pro Connecté' : 'Connecter un profil professionnel'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PAGE 2 : SÉLECTEUR DE NICHE & RÈGLES */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl space-y-6 h-fit">
          <div>
            <h2 className="text-lg font-bold text-gray-200 mb-1">Configuration de l'IA</h2>
            <p className="text-xs text-gray-500">Ajustez le comportement et le ton du moteur OpenAI</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Niche Commerciale</label>
            <select 
              value={niche} 
              onChange={(e) => setNiche(e.target.value)} 
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="Immobilier">🏠 Immobilier</option>
              <option value="E-commerce">🛍️ E-commerce</option>
              <option value="Santé">🌿 Santé & Bien-être</option>
              <option value="Technologie">💻 Tech & Digital BPO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Consignes de Modération Strictes</label>
            <textarea 
              value={rules} 
              onChange={(e) => setRules(e.target.value)} 
              rows="4" 
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition placeholder-gray-600" 
              placeholder="Exemple : Toujours utiliser le vouvoiement. Ne jamais divulguer de tarifs publiquement." 
            />
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-950/50 transition">
            Sauvegarder les règles
          </button>
        </div>

        {/* PAGE 3 : LE CALENDRIER ET LA BOÎTE DE MODÉRATION */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Bloc de création instantanée */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-gray-200 mb-3">Sujet du Jour</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="Ex: 3 astuces indispensables pour investir intelligemment..." 
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500" 
              />
              <button 
                onClick={generatePost} 
                disabled={loading} 
                className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-950/40 transition disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Rédaction IA...' : 'Rédiger le Post'}
              </button>
            </div>
          </div>

          {/* Publications Générées */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-gray-200 mb-4">Publications Prêtes (En attente)</h2>
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl">
                  <p className="text-sm text-gray-500">Aucun post en attente. Le Cron s'exécute chaque matin à 9h.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-gray-800/40 border border-gray-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-md">Sujet : {post.subject}</span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{post.content}</p>
                    <div className="flex gap-2 pt-2 border-t border-gray-800/60">
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-4 py-2 rounded-lg transition">Approuver & Publier</button>
                      <button className="bg-gray-800 hover:bg-gray-700 text-xs font-bold px-4 py-2 rounded-lg text-gray-400 transition">Éditer</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Historique de modération */}
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-bold text-gray-200 mb-4">Registre de Suivi de Modération (Auto)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-gray-800 text-gray-400 font-semibold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Auteur</th>
                    <th className="p-3">Commentaire</th>
                    <th className="p-3">Action IA</th>
                    <th className="p-3 rounded-r-xl">Réponse Émise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-xs text-gray-600 italic">Aucune interaction modérée au cours des dernières 24h.</td>
                    </tr>
                    ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800/20 transition">
                        <td className="p-3 text-white font-medium">{log.user_name}</td>
                        <td className="p-3 truncate max-w-xs">{log.incoming_message}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${log.ai_decision === 'BLOQUER' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {log.ai_decision}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-gray-500 italic max-w-xs truncate">"{log.ai_response}"</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
