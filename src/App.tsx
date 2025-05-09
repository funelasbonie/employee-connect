import React, { useState } from 'react';
import './App.css';

interface Field {
  Id: string;
  Label: string;
  Type: string;
  List: {
    Item: string[];
  };
  Visible: boolean;
  Mandatory: boolean;
  DisplayOnly: boolean;
  Comment: string;
}

interface FormData {
  Form: {
    Field: Field[];
  };
}

function App() {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
    };
    reader.readAsText(file);
  };

  const parseXml = () => {
    try {
      if (!xmlContent) {
        setError('Please upload an XML file first');
        return;
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        setError('Invalid XML file');
        return;
      }

      const fields: Field[] = [];
      const fieldElements = xmlDoc.getElementsByTagName('Field');

      if (fieldElements.length === 0) {
        setError('No Field elements found in the XML');
        return;
      }

      for (let i = 0; i < fieldElements.length; i++) {
        const field = fieldElements[i];
        const listItems: string[] = [];
        
        const listElement = field.getElementsByTagName('List')[0];
        if (listElement && listElement.getElementsByTagName('Item').length > 0) {
          const items = listElement.getElementsByTagName('Item');
          for (let j = 0; j < items.length; j++) {
            const itemText = items[j].textContent || '';
            if (itemText) {
              listItems.push(itemText);
            }
          }
        }

        const getId = field.getElementsByTagName('Id')[0]?.textContent || '';
        const getLabel = field.getElementsByTagName('Label')[0]?.textContent || '';
        const getType = field.getElementsByTagName('Type')[0]?.textContent || '';
        const getVisible = field.getElementsByTagName('Visible')[0]?.textContent === 'true';
        const getMandatory = field.getElementsByTagName('Mandatory')[0]?.textContent === 'true';
        const getDisplayOnly = field.getElementsByTagName('DisplayOnly')[0]?.textContent === 'true';
        const getComment = field.getElementsByTagName('Comment')[0]?.textContent || '';

        fields.push({
          Id: getId,
          Label: getLabel,
          Type: getType,
          List: { Item: listItems },
          Visible: getVisible,
          Mandatory: getMandatory,
          DisplayOnly: getDisplayOnly,
          Comment: getComment,
        });
      }

      if (fields.length === 0) {
        setError('No valid fields found in the XML');
        return;
      }

      setFormData({ Form: { Field: fields } });
      const initialValues: Record<string, string> = {};
      fields.forEach(field => {
        if (field.Visible && !field.DisplayOnly) {
          initialValues[field.Id] = '';
        }
      });
      setFormValues(initialValues);
    } catch (err) {
      setError('Error parsing XML: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    const headers: string[] = ['Id', 'Label', 'Type', 'Value', 'Visible', 'Mandatory', 'DisplayOnly', 'Comment'];
    
    let csvContent = headers.join(',') + '\n';
    
    formData.Form.Field.forEach(field => {
      if (field.Visible) {
        const rowData = [
          field.Id,
          `"${field.Label.replace(/"/g, '""')}"`,
          field.Type,
          `"${formValues[field.Id]?.replace(/"/g, '""') || ''}"`,
          field.Visible.toString(),
          field.Mandatory.toString(),
          field.DisplayOnly.toString(),
          `"${field.Comment.replace(/"/g, '""')}"`
        ];
        csvContent += rowData.join(',') + '\n';
      }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'form_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderForm = () => {
    if (!formData) return null;

    return (
      <div className="generated-form">
        <h2>Generated Form</h2>
        <form onSubmit={handleFormSubmit}>
          {formData.Form.Field.map((field) => {
            if (!field.Visible) return null;

            return (
              <div className="form-field" key={field.Id}>
                <label>
                  {field.Label} {field.Mandatory && <span className="required">*</span>}
                </label>
                
                {field.Type === 'Text' && (
                  <input 
                    type="text" 
                    required={field.Mandatory}
                    disabled={field.DisplayOnly}
                    title={field.Comment}
                    value={formValues[field.Id] || ''}
                    onChange={(e) => handleInputChange(field.Id, e.target.value)}
                  />
                )}
                
                {field.Type === 'Number' && (
                  <input 
                    type="number" 
                    required={field.Mandatory}
                    disabled={field.DisplayOnly}
                    title={field.Comment}
                    value={formValues[field.Id] || ''}
                    onChange={(e) => handleInputChange(field.Id, e.target.value)}
                  />
                )}
                
                {field.Type === 'Textarea' && (
                  <textarea
                    required={field.Mandatory}
                    disabled={field.DisplayOnly}
                    title={field.Comment}
                    value={formValues[field.Id] || ''}
                    onChange={(e) => handleInputChange(field.Id, e.target.value)}
                  />
                )}
                
                {field.Type === 'Dropdown' && (
                  <select
                    required={field.Mandatory}
                    disabled={field.DisplayOnly}
                    title={field.Comment}
                    value={formValues[field.Id] || ''}
                    onChange={(e) => handleInputChange(field.Id, e.target.value)}
                  >
                    <option value="">Select an option</option>
                    {field.List.Item.map((item, index) => (
                      <option key={index} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                )}
                
                {field.Comment && (
                  <div className="field-comment">{field.Comment}</div>
                )}
              </div>
            );
          })}
          {formData.Form.Field.some(field => field.Visible) && (
            <button type="submit">Submit</button>
          )}
        </form>
      </div>
    );
  };

  return (
    <div className="App">
      <h1>XML Form Generator</h1>
      
      <div className="upload-section">
        <h2>Upload XML File</h2>
        <input 
          type="file" 
          accept=".xml"
          onChange={handleFileUpload}
        />
        <button onClick={parseXml} disabled={!xmlContent}>
          Generate Form
        </button>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      {renderForm()}
    </div>
  );
}

export default App;
