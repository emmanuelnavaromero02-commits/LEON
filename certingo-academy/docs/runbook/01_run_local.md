# Run Local Runbook

1. **Setup Environment**:
   ```bash
   make setup
   ```

2. **Initialize Database**:
   ```bash
   make seed
   ```

3. **Start Development Servers**:
   ```bash
   make backend &
   make frontend
   ```

4. **Access Platform**:
   - Student Dashboard: http://localhost:3000/dashboard
   - Admin Console: http://localhost:3000/admin/control-room
