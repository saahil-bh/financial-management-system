CREATE OR REPLACE FUNCTION public.fn_log_receipt_changes()
  RETURNS TRIGGER
AS $$
DECLARE
  log_action VARCHAR;
  doc_id INT;
  actor_id_from_row uuid;
BEGIN
  -- On INSERT (Create)
  IF (TG_OP = 'INSERT') THEN
    doc_id := NEW.r_id;
    actor_id_from_row := NEW.u_id;
    log_action := 'Receipt ' || doc_id || ' created with status ' || NEW.status;

    INSERT INTO logs (action, actor_id, document_id, timestamp)
    VALUES (log_action, actor_id_from_row, doc_id, NOW());

    RETURN NEW;

  -- On UPDATE (Status change: Confirmed, Rejected)
  ELSIF (TG_OP = 'UPDATE') THEN
    doc_id := NEW.r_id;
    actor_id_from_row := NEW.u_id;

    -- Only log if the status has actually changed (IS DISTINCT FROM handles NULL values safely)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      log_action := 'Receipt ' || doc_id || ' status changed from ' || OLD.status || ' to ' || NEW.status;
      
      -- Optional: Create a more human-readable action for confirmation/rejection
      IF NEW.status IN ('Confirmed', 'Rejected') THEN
          log_action := 'Receipt ' || doc_id || ' was ' || NEW.status || '.';
      END IF;

      INSERT INTO logs (action, actor_id, document_id, timestamp)
      VALUES (log_action, actor_id_from_row, doc_id, NOW());
    END IF;

    RETURN NEW;

  -- On DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    doc_id := OLD.r_id;
    actor_id_from_row := OLD.u_id;
    log_action := 'Receipt ' || doc_id || ' deleted.';

    INSERT INTO logs (action, actor_id, document_id, timestamp)
    VALUES (log_action, actor_id_from_row, doc_id, NOW());

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_receipt_log
  -- Run this function AFTER any of these actions
  AFTER INSERT OR UPDATE OR DELETE ON Receipts
  -- Run it once for each row that was changed
  FOR EACH ROW
  -- Call the function we just created
  EXECUTE FUNCTION public.fn_log_receipt_changes();