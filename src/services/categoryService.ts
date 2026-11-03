import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));
    
    const querySnapshot = await getDocs(q);
    const categoriesList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Category));
    
    return categoriesList;
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
};