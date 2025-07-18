// ... existing code ...
// Create a new sample type
router.post('/', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const sample = await db.sample_type.create({ name });
    res.status(201).json(sample);
  } catch (error) {
    console.error('Error creating sample type:', error);
    res.status(500).json({ error: 'Failed to create sample type' });
  }
});

// Update a sample type
router.put('/:id', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const { name } = req.body;
    const sample = await db.sample_type.findByPk(req.params.id);
    if (!sample) return res.status(404).json({ error: 'Sample type not found' });
    sample.name = name || sample.name;
    await sample.save();
    res.json(sample);
  } catch (error) {
    console.error('Error updating sample type:', error);
    res.status(500).json({ error: 'Failed to update sample type' });
  }
});

// Delete a sample type
router.delete('/:id', authenticateUser, authorizeRoles('admin', 'chemist'), async (req, res) => {
  try {
    const sample = await db.sample_type.findByPk(req.params.id);
    if (!sample) return res.status(404).json({ error: 'Sample type not found' });
    await sample.destroy();
    res.json({ message: 'Sample type deleted successfully' });
  } catch (error) {
    console.error('Error deleting sample type:', error);
    res.status(500).json({ error: 'Failed to delete sample type' });
  }
});
// ... existing code ... 