// Add this to authController.js to create a diagnostic endpoint

// Diagnostic endpoint - GET /api/auth/student-check/:email
const studentCheckDiagnostic = async (req, res) => {
    try {
        const { email } = req.params;
        const testPassword = req.query.password || 'test123';
        
        console.log('\n========== DIAGNOSTIC CHECK ==========');
        console.log('📧 Checking student:', email);
        console.log('🔐 Test password:', testPassword);
        
        const student = await Student.findOne({ email });
        
        if (!student) {
            console.log('❌ Student not found');
            return res.status(404).json({ 
                error: 'Student not found',
                email: email
            });
        }
        
        console.log('✅ Student found in database');
        console.log('📝 Full Name:', student.fullName);
        console.log('🔒 Password field exists:', !!student.password);
        console.log('🔒 Password length:', student.password?.length || 0);
        console.log('🔒 Password starts with:', student.password?.substring(0, 10));
        console.log('📝 Plain password:', student.plainPassword);
        
        // Test password comparison
        console.log('\n🔐 Testing password comparison:');
        console.log('Input password:', testPassword);
        
        let isValid = false;
        try {
            isValid = await bcrypt.compare(testPassword, student.password);
            console.log('✅ Comparison result:', isValid);
        } catch (error) {
            console.log('❌ Comparison error:', error.message);
        }
        
        // Return diagnostic info
        res.status(200).json({
            found: true,
            email: student.email,
            fullName: student.fullName,
            passwordExists: !!student.password,
            passwordLength: student.password?.length || 0,
            passwordStarts: student.password?.substring(0, 10),
            isBcryptHash: student.password && (
                student.password.startsWith('$2a$') ||
                student.password.startsWith('$2b$') ||
                student.password.startsWith('$2x$') ||
                student.password.startsWith('$2y$')
            ),
            plainPassword: student.plainPassword,
            comparisonTest: {
                inputPassword: testPassword,
                isValid: isValid,
                error: null
            }
        });
    } catch (error) {
        console.error('Diagnostic error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    studentLogin,
    parentLogin,
    teacherLogin,
    verifyToken,
    studentCheckDiagnostic  // Add this export
};
