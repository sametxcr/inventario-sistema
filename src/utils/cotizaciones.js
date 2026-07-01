router.post('/:id/crear-ot', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Buscar COT
    const cot = await db.query('SELECT * FROM cotizaciones WHERE id = $1', [id]);
    
    if (cot.rows.length === 0) {
      return res.status(404).json({ error: 'COT no encontrada' });
    }
    
    if (cot.rows[0].ot_id) {
      return res.status(400).json({ error: 'Ya fue convertida' });
    }

    // 2. Crear OT básica
    const otResult = await db.query(
      `INSERT INTO ordenes_trabajo (patente, detalle, valor_trabajo, estado_ot) 
       VALUES ($1, $2, $3, 'PENDIENTE') 
       RETURNING id`,
      [cot.rows[0].patente, cot.rows[0].detalle, cot.rows[0].total]
    );

    const otId = otResult.rows[0].id;

    // 3. Marcar COT como convertida
    await db.query(
      'UPDATE cotizaciones SET ot_id = $1, estado = $2 WHERE id = $3',
      [otId, 'CONVERTIDA', id]
    );

    res.json({ success: true, ot_id: otId });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear OT' });
  }
});

