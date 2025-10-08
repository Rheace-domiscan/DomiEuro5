import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader(_: LoaderFunctionArgs) {
  return redirect('/home');
}

export default function IndexRedirect() {
  return null;
}
