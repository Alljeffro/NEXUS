import { NextResponse } from 'next/server';
import { supabase } from '../lib/db';
import { generateAIPost } from '../lib/openai';

export async function GET(req) {
  // Sécuriser l'accès au Cron pour que seul Vercel puisse le déclencher
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  try {
    // 1. Récupérer le profil principal de l'administrateur
    const userId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('niche, rules')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    // Idée de sujet dynamique ou basée sur une liste (ici un sujet général par défaut à adapter)
    const subjectOfTheDay = "Les 3 erreurs fatales à éviter cette semaine pour maximiser vos résultats";

    // 2. Générer le post avec OpenAI (Module 1)
    const aiContent = await generateAIPost(profile.niche, subjectOfTheDay, profile.rules);

    // 3. Enregistrer automatiquement dans la table 'posts' en attente de validation
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert([
        { 
          user_id: userId, 
          subject: subjectOfTheDay, 
          content: aiContent, 
          status: 'pending' 
        }
      ]);

    if (postError) throw postError;

    return NextResponse.json({ success: true, message: "Post du jour généré avec succès !" });

  } catch (error) {
    console.error("Erreur Cron Generate Post :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
