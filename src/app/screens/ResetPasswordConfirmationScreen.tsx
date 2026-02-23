import { CheckCircle, Mail } from 'lucide-react';
import { useNavigate } from '../utils/navigation';

export function ResetPasswordConfirmationScreen() {
  const navigate = useNavigate();

  const handleChangePassword = () => {
    navigate('/create-new-password');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold mb-3">Check your email</h1>
        <p className="text-gray-600 mb-8">
          We've sent a password reset link to your email
        </p>

        {/* Email Icon */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Click the link in the email to reset your password
          </p>
          
          {/* Simulate Email Button */}
          <button
            onClick={handleChangePassword}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Change Password
          </button>
        </div>

        {/* Back to Login */}
        <button
          onClick={() => navigate('/login')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
