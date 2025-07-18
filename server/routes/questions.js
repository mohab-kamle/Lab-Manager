const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRoles = require('../middleware/authorizeRoles');
const db = require('../models');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'), false);
    }
  }
});

// Get all questions
router.get('/', authenticateUser, async (req, res) => {
  try {
    const questions = await db.question.findAll({
      where: { is_active: true },
      include: [
        {
          model: db.test,
          as: 'tests',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get question by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const questionData = await db.question.findByPk(req.params.id, {
      include: [
        {
          model: db.test,
          as: 'tests',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!questionData) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(questionData);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Create new question
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { text, category, testIds } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    const newQuestion = await db.question.create({
      text,
      category,
      is_active: true
    });
    
    // Associate with tests if provided
    if (testIds && Array.isArray(testIds) && testIds.length > 0) {
      await newQuestion.setTests(testIds);
    }
    
    const questionWithTests = await db.question.findByPk(newQuestion.id, {
      include: [
        {
          model: db.test,
          as: 'tests',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });
    
    res.status(201).json(questionWithTests);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update question
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { text, category, is_active, testIds } = req.body;
    const questionId = req.params.id;
    
    const questionData = await db.question.findByPk(questionId);
    if (!questionData) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    await questionData.update({
      text: text || questionData.text,
      category: category !== undefined ? category : questionData.category,
      is_active: is_active !== undefined ? is_active : questionData.is_active
    });
    
    // Update test associations if provided
    if (testIds !== undefined) {
      await questionData.setTests(testIds || []);
    }
    
    const updatedQuestion = await db.question.findByPk(questionId, {
      include: [
        {
          model: db.test,
          as: 'tests',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ]
    });
    
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question (soft delete)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const questionData = await db.question.findByPk(req.params.id);
    if (!questionData) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    await questionData.update({ is_active: false });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Get questions by category
router.get('/category/:category', authenticateUser, async (req, res) => {
  try {
    const questions = await db.question.findAll({
      where: { 
        category: req.params.category,
        is_active: true 
      },
      include: [
        {
          model: db.test,
          as: 'tests',
          through: { attributes: [] },
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    res.status(500).json({ error: 'Failed to fetch questions by category' });
  }
});

// Get questions for a specific test
router.get('/test/:testId', authenticateUser, async (req, res) => {
  try {
    const testData = await db.test.findByPk(req.params.testId, {
      include: [
        {
          model: db.question,
          as: 'questions',
          through: { attributes: [] },
          where: { is_active: true },
          required: false
        }
      ]
    });
    
    if (!testData) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    res.json(testData.questions || []);
  } catch (error) {
    console.error('Error fetching questions for test:', error);
    res.status(500).json({ error: 'Failed to fetch questions for test' });
  }
});

// Update questions for a specific test
router.put('/:testId/tests', authenticateUser, async (req, res) => {
  try {
    const { questionIds } = req.body;
    const testId = req.params.testId;
    
    // Check if test exists
    const testData = await db.test.findByPk(testId);
    if (!testData) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Update the test's questions
    await testData.setQuestions(questionIds || []);
    
    // Return the updated test with questions
    const updatedTest = await db.test.findByPk(testId, {
      include: [
        {
          model: db.question,
          as: 'questions',
          through: { attributes: [] },
          where: { is_active: true },
          required: false
        }
      ]
    });
    
    res.json(updatedTest);
  } catch (error) {
    console.error('Error updating questions for test:', error);
    res.status(500).json({ error: 'Failed to update questions for test' });
  }
});

// Import questions from Excel/CSV
router.post('/import', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'No data found in the file' });
    }

    const errors = [];
    let imported = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and we have headers

      try {
        if (!row.Text && !row.text) {
          errors.push(`Row ${rowNumber}: Question text is required`);
          continue;
        }

        const questionText = row.Text || row.text;
        const category = row.Category || row.category || null;

        // Check if question already exists
        const existingQuestion = await db.question.findOne({
          where: { 
            text: questionText,
            is_active: true
          }
        });

        if (existingQuestion) {
          errors.push(`Row ${rowNumber}: Question "${questionText}" already exists`);
          continue;
        }

        await db.question.create({
          text: questionText,
          category: category,
          is_active: true
        });

        imported++;
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    res.json({
      imported,
      errors,
      message: `Successfully imported ${imported} questions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Error importing questions:', error);
    res.status(500).json({ error: 'Failed to import questions' });
  }
});

// Export questions to Excel
router.get('/export/excel', authenticateUser, async (req, res) => {
  try {
    const questions = await db.question.findAll({
      where: { is_active: true },
      order: [['createdAt', 'DESC']]
    });

    const exportData = questions.map(q => ({
      'Text': q.text,
      'Category': q.category || '',
      'Created At': q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=questions_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting questions:', error);
    res.status(500).json({ error: 'Failed to export questions' });
  }
});

module.exports = router; 