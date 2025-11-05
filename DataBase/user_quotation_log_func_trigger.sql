CREATE OR REPLACE FUNCTION public.fn_log_quotation_changes()
  RETURNS TRIGGER
AS $$
DECLARE
  log_action VARCHAR;
  doc_id INT;
  actor_id_from_row uuid;
BEGIN
  --
  -- On INSERT (Create)
  --
  IF (TG_OP = 'INSERT') THEN
    doc_id := NEW.q_id;
    actor_id_from_row := NEW.user_id; -- Get user from the new row
    log_action := 'Quotation ' || doc_id || ' created with status ' || NEW.status;

    INSERT INTO logs (action, actor_id, document_id)
    VALUES (log_action, actor_id_from_row, doc_id);

    RETURN NEW;

  --
  -- On UPDATE (Status change, etc.)
  --
  ELSIF (TG_OP = 'UPDATE') THEN
    doc_id := NEW.q_id;
    actor_id_from_row := NEW.user_id; -- Get user from the updated row

    -- This is the key part from your spec!
    -- Only log if the status has *actually changed*.
    IF NEW.status <> OLD.status THEN
      log_action := 'Quotation ' || doc_id || ' status changed from ' || OLD.status || ' to ' || NEW.status;
      
      INSERT INTO logs (action, actor_id, document_id)
      VALUES (log_action, actor_id_from_row, doc_id);
    END IF;

    RETURN NEW;

  --
  -- On DELETE
  --
  ELSIF (TG_OP = 'DELETE') THEN
    doc_id := OLD.q_id;
    actor_id_from_row := OLD.user_id; -- Get user from the old row being deleted
    log_action := 'Quotation ' || doc_id || ' deleted.';
    
    INSERT INTO logs (action, actor_id, document_id)
    VALUES (log_action, actor_id_from_row, doc_id);

    RETURN OLD;

  END IF;

  RETURN NULL; 
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_quotation_log ON Quotations;


CREATE TRIGGER tr_quotation_log

  AFTER INSERT OR UPDATE OR DELETE ON Quotations
 
  FOR EACH ROW
  
  EXECUTE FUNCTION public.fn_log_quotation_changes();