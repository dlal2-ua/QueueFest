import { CheckCircle } from 'lucide-react';
import { useNavigate } from '../utils/navigation';

export function PasswordUpdatedScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-3">Success!</h1>
        <p className="text-gray-600 mb-8">
          Password successfully updated
        </p>

        {/* Message Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <p className="text-sm text-gray-600">
            Your password has been changed successfully. You can now use your new password to log in.
          </p>
        </div>

        {/* Back to Login Button */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl py-4 font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
